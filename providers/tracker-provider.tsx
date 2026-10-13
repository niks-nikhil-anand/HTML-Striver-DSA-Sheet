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
  getBrowserStorage,
  loadProgress,
  saveProgress,
} from "@/lib/storage";
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
  toggleComplete: (id: string) => void;
  setNote: (id: string, note: string) => void;
  setRevision: (id: string, status: RevisionStatus | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  setStartDate: (iso: string) => void;
  replaceProgress: (p: Progress) => void;
  resetProgress: () => void;
}

export const TrackerContext = createContext<TrackerValue | null>(null);
const problemById = new Map(PROBLEMS.map((p) => [p.id, p]));

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("2026-10-13");
  const [storageOk, setStorageOk] = useState(true);
  const [corrupted, setCorrupted] = useState(false);
  const ref = useRef(progress);
  const todayRef = useRef(today);

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
    ref.current = next;
    setProgress(next);
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

  const replaceProgress = useCallback((p: Progress) => commit(p), [commit]);

  const resetProgress = useCallback(() => {
    clearProgress(getBrowserStorage());
    commit(defaultProgress());
  }, [commit]);

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
    toggleComplete, setNote, setRevision, setFilters, clearFilters, setStartDate, replaceProgress, resetProgress,
  };
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
