"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { todayIso } from "@/lib/dates";
import { applyFilters, buildDayIndex, sortProblems } from "@/lib/filters";
import { PROBLEMS, PROBLEM_IDS } from "@/lib/problems";
import { currentDayIndex, generateSchedule } from "@/lib/schedule";
import {
  crossedMilestone,
  dayProgress,
  overallProgress,
  overdueIds,
  streaksFromCompleted,
  topicProgress,
} from "@/lib/stats";
import {
  clearProgress,
  defaultProgress,
  exportProgress,
  getBrowserStorage,
  loadProgress,
  saveProgress,
} from "@/lib/storage";
import { SyncController, type SyncMode } from "@/lib/sync/controller";
import type { SyncState } from "@/lib/sync/queue";
import { DEFAULT_FILTERS, type DayPlan, type Filters, type Problem, type Progress, type RevisionStatus } from "@/lib/types";

export interface TrackerValue {
  /** False until LocalStorage has been read on the client (avoids hydration mismatch). */
  ready: boolean;
  progress: Progress;
  today: string;
  schedule: DayPlan[];
  dayOf: ReadonlyMap<string, DayPlan>;
  problemById: ReadonlyMap<string, Problem>;
  todayIndex: number;
  todayPlan: DayPlan | undefined;
  overall: ReturnType<typeof overallProgress>;
  streaks: { current: number; longest: number };
  topics: ReturnType<typeof topicProgress>;
  overdue: string[];
  filters: Filters;
  filtered: Problem[];
  storageOk: boolean;
  corrupted: boolean;
  /** Server sync (feature-flagged). `mode` is "guest" when signed out or when sync is disabled. */
  sync: { enabled: boolean; mode: SyncMode; state: SyncState; pending: number };
  /** Set when this device has progress, the account is empty and the user has not chosen yet. */
  claimOffer: Progress | null;
  claimLocal: () => Promise<void>;
  dismissClaim: () => void;
  exportData: () => Promise<string>;
  toggleComplete: (id: string) => void;
  setNote: (id: string, note: string) => void;
  setRevision: (id: string, status: RevisionStatus | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  setStartDate: (iso: string) => void;
  replaceProgress: (p: Progress) => Promise<void>;
  resetProgress: () => Promise<void>;
}

export const TrackerContext = createContext<TrackerValue | null>(null);
const problemById = new Map(PROBLEMS.map((p) => [p.id, p]));
const SYNC_ENABLED = process.env.NEXT_PUBLIC_SYNC === "on";

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2026-10-13");
  const [storageOk, setStorageOk] = useState(true);
  const [corrupted, setCorrupted] = useState(false);
  const ref = useRef(progress);
  const todayRef = useRef(today);
  const controllerRef = useRef<SyncController | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>("guest");
  const [syncState, setSyncState] = useState<{ state: SyncState; pending: number }>({ state: "idle", pending: 0 });
  const [claimOffer, setClaimOffer] = useState<Progress | null>(null);

  // Read browser-only state after hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from LocalStorage */
    const storage = getBrowserStorage();
    const res = loadProgress(storage, PROBLEM_IDS);
    ref.current = res.progress;
    setProgress(res.progress);
    setCorrupted(res.corrupted);
    setStorageOk(storage !== null);
    const t = todayIso();
    todayRef.current = t;
    setToday(t);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!SYNC_ENABLED) return;
    const controller = new SyncController(
      {
        getProgress: () => ref.current,
        apply: (p) => {
          ref.current = p;
          setProgress(p);
        },
        onMode: setSyncMode,
        onStatus: (s) => setSyncState({ state: s.state, pending: s.pending }),
        onClaimOffer: setClaimOffer,
        notify: (kind, message) => (kind === "error" ? toast.error(message) : toast(message)),
      },
      storage,
    );
    controllerRef.current = controller;
    void controller.start();
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Roll "today" over at midnight / when the tab regains focus.
  useEffect(() => {
    const tick = () => {
      const t = todayIso();
      if (t !== todayRef.current) {
        todayRef.current = t;
        setToday(t);
      }
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const storage = getBrowserStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the result of writing to an external store
    setStorageOk(storage !== null && saveProgress(storage, progress));
  }, [progress, ready]);

  const commit = useCallback((next: Progress) => {
    const prev = ref.current;
    ref.current = next;
    setProgress(next);
    controllerRef.current?.track(prev, next); // queues the minimal server writes (no-op in guest mode)
  }, []);

  const schedule = useMemo(() => generateSchedule(PROBLEMS, progress.startDate), [progress.startDate]);
  const dayOf = useMemo(() => buildDayIndex(schedule), [schedule]);
  const scheduleRef = useRef(schedule);
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const toggleComplete = useCallback(
    (id: string) => {
      const prev = ref.current;
      const completed = { ...prev.completed };
      const t = todayRef.current;
      const wasDone = !!completed[id];
      if (wasDone) {
        delete completed[id];
        commit({ ...prev, completed });
        return;
      }
      completed[id] = { date: t, at: Date.now() };
      let next: Progress = { ...prev, completed };

      const before = Object.keys(prev.completed).length;
      const after = Object.keys(completed).length;
      const sBefore = streaksFromCompleted(prev.completed, t);
      const sAfter = streaksFromCompleted(completed, t);
      const doneToday = (c: Progress["completed"]) => Object.values(c).filter((r) => r.date === t).length;
      const plan = scheduleRef.current.find((d) => d.date === t);
      const planBefore = dayProgress(plan, prev.completed);
      const planAfter = dayProgress(plan, completed);

      const milestone = crossedMilestone(before, after);
      if (milestone && !prev.prefs.celebratedMilestones.includes(milestone)) {
        next = { ...next, prefs: { ...next.prefs, celebratedMilestones: [...prev.prefs.celebratedMilestones, milestone] } };
        toast.success(`Milestone: ${milestone} problems solved!`, { description: "That is serious, compounding progress. Keep going." });
      } else if (plan && planAfter.total > 0 && planAfter.done === planAfter.total && planBefore.done < planBefore.total) {
        toast.success("Both of today's problems are done", { description: "Day complete. Rest well and come back tomorrow." });
      } else if (sAfter.current > sBefore.longest && sAfter.current >= 2) {
        toast.success(`New personal best: ${sAfter.current}-day streak`, { description: "Consistency is paying off." });
      } else if (doneToday(prev.completed) === 0) {
        toast("First problem of the day down", { description: "The hardest part is starting. You've started." });
      }
      commit(next);
    },
    [commit],
  );

  const setNote = useCallback(
    (id: string, note: string) => {
      const prev = ref.current;
      const notes = { ...prev.notes };
      if (note.trim()) notes[id] = note.slice(0, 5000);
      else delete notes[id];
      commit({ ...prev, notes });
    },
    [commit],
  );

  const setRevision = useCallback(
    (id: string, status: RevisionStatus | null) => {
      const prev = ref.current;
      const revision = { ...prev.revision };
      if (status) revision[id] = status;
      else delete revision[id];
      commit({ ...prev, revision });
    },
    [commit],
  );

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const prev = ref.current;
      commit({ ...prev, prefs: { ...prev.prefs, filters: { ...prev.prefs.filters, ...patch } } });
    },
    [commit],
  );

  const clearFilters = useCallback(() => {
    const prev = ref.current;
    commit({ ...prev, prefs: { ...prev.prefs, filters: { ...DEFAULT_FILTERS, sort: prev.prefs.filters.sort } } });
  }, [commit]);

  const setStartDate = useCallback(
    (startDate: string) => commit({ ...ref.current, startDate }),
    [commit],
  );

  const replaceProgress = useCallback(
    async (p: Progress) => {
      const c = controllerRef.current;
      if (c && c.mode === "synced") {
        await c.importReplace(p); // server validates, replaces, then we adopt its snapshot
        return;
      }
      commit(p);
    },
    [commit],
  );

  const resetProgress = useCallback(async () => {
    const c = controllerRef.current;
    if (c && c.mode === "synced") {
      await c.reset();
      return;
    }
    clearProgress(getBrowserStorage());
    commit(defaultProgress());
  }, [commit]);

  const exportData = useCallback(async () => {
    const fromServer = await controllerRef.current?.exportText();
    return fromServer ?? exportProgress(ref.current);
  }, []);

  const claimLocal = useCallback(async () => {
    const offer = claimOffer;
    if (!offer || !controllerRef.current) return;
    await controllerRef.current.claimLocal(offer);
    setClaimOffer(null);
  }, [claimOffer]);

  const dismissClaim = useCallback(() => {
    controllerRef.current?.dismissClaim();
    setClaimOffer(null);
  }, []);

  const filters = progress.prefs.filters;
  const filtered = useMemo(
    () =>
      sortProblems(
        applyFilters(PROBLEMS, filters, { dayOf, completed: progress.completed, today }),
        filters.sort,
        progress.completed,
      ),
    [filters, dayOf, progress.completed, today],
  );

  const todayIndex = useMemo(() => currentDayIndex(schedule, today), [schedule, today]);
  const todayPlan = todayIndex >= 0 && todayIndex < schedule.length ? schedule[todayIndex] : undefined;
  const overall = useMemo(() => overallProgress(PROBLEMS, progress.completed), [progress.completed]);
  const streaks = useMemo(() => streaksFromCompleted(progress.completed, today), [progress.completed, today]);
  const topics = useMemo(() => topicProgress(PROBLEMS, progress.completed), [progress.completed]);
  const overdue = useMemo(() => overdueIds(schedule, progress.completed, today), [schedule, progress.completed, today]);

  const value: TrackerValue = {
    ready, progress, today, schedule, dayOf, problemById, todayIndex, todayPlan, overall, streaks, topics, overdue,
    filters, filtered, storageOk, corrupted,
    sync: { enabled: SYNC_ENABLED, mode: syncMode, ...syncState }, claimOffer, claimLocal, dismissClaim, exportData,
    toggleComplete, setNote, setRevision, setFilters, clearFilters, setStartDate, replaceProgress, resetProgress,
  };
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
