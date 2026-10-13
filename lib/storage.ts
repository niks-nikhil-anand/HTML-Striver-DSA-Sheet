import { isIsoDate } from "./dates";
import { DEFAULT_START_DATE } from "./schedule";
import { DEFAULT_FILTERS, type Filters, type Progress } from "./types";

export const STORAGE_KEY = "dsa-tracker:v1";
const SORTS = ["schedule", "title", "difficulty", "topic", "status"];
const DATES = ["all", "today", "upcoming", "completed-days", "overdue"];
const STATUSES = ["all", "completed", "pending"];
const DIFFS = ["All", "Easy", "Medium", "Hard"];

export function defaultProgress(): Progress {
  return {
    version: 1,
    startDate: DEFAULT_START_DATE,
    completed: {},
    notes: {},
    revision: {},
    prefs: { filters: { ...DEFAULT_FILTERS }, celebratedMilestones: [] },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizeFilters(raw: unknown): Filters {
  const f = isObj(raw) ? raw : {};
  return {
    difficulty: DIFFS.includes(f.difficulty as string) ? (f.difficulty as Filters["difficulty"]) : "All",
    topic: typeof f.topic === "string" && f.topic ? f.topic : "All",
    status: STATUSES.includes(f.status as string) ? (f.status as Filters["status"]) : "all",
    date: DATES.includes(f.date as string) ? (f.date as Filters["date"]) : "all",
    query: typeof f.query === "string" ? f.query.slice(0, 200) : "",
    sort: SORTS.includes(f.sort as string) ? (f.sort as Filters["sort"]) : "schedule",
  };
}

/**
 * Strictly validate unknown data (from LocalStorage or an imported file).
 * Returns a clean Progress, or null if the shape is not recognisable.
 * Entries for problem IDs not in `knownIds` are dropped when provided.
 */
export function validateProgress(raw: unknown, knownIds?: ReadonlySet<string>): Progress | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  if (!isIsoDate(raw.startDate)) return null;
  if (!isObj(raw.completed) || !isObj(raw.notes) || !isObj(raw.revision)) return null;
  const keep = (id: string) => !knownIds || knownIds.has(id);

  const out = defaultProgress();
  out.startDate = raw.startDate;

  for (const [id, rec] of Object.entries(raw.completed)) {
    if (!isObj(rec) || !isIsoDate(rec.date) || typeof rec.at !== "number" || !Number.isFinite(rec.at)) return null;
    if (keep(id)) out.completed[id] = { date: rec.date, at: rec.at };
  }
  for (const [id, note] of Object.entries(raw.notes)) {
    if (typeof note !== "string") return null;
    if (keep(id) && note.trim()) out.notes[id] = note.slice(0, 5000);
  }
  for (const [id, st] of Object.entries(raw.revision)) {
    if (st !== "needs-revision" && st !== "mastered") return null;
    if (keep(id)) out.revision[id] = st;
  }
  if (isObj(raw.prefs)) {
    out.prefs.filters = sanitizeFilters(raw.prefs.filters);
    const cm = raw.prefs.celebratedMilestones;
    out.prefs.celebratedMilestones = Array.isArray(cm) ? cm.filter((n): n is number => typeof n === "number") : [];
  }
  return out;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface LoadResult {
  progress: Progress;
  /** True when stored data existed but could not be used. */
  corrupted: boolean;
}

export function loadProgress(storage: StorageLike | null, knownIds?: ReadonlySet<string>): LoadResult {
  if (!storage) return { progress: defaultProgress(), corrupted: false };
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text == null) return { progress: defaultProgress(), corrupted: false };
    const valid = validateProgress(JSON.parse(text), knownIds);
    return valid ? { progress: valid, corrupted: false } : { progress: defaultProgress(), corrupted: true };
  } catch {
    return { progress: defaultProgress(), corrupted: true };
  }
}

export function saveProgress(storage: StorageLike | null, progress: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage: StorageLike | null): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify({ app: "dsa-tracker", exportedAt: new Date().toISOString(), ...progress }, null, 2);
}

export function parseImport(text: string, knownIds?: ReadonlySet<string>): Progress | null {
  try {
    return validateProgress(JSON.parse(text), knownIds);
  } catch {
    return null;
  }
}
