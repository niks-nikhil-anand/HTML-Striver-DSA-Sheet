import type { PutProgressBody } from "@/lib/api-types";
import type { Filters, Progress } from "@/lib/types";

/** A unit of change to send to the server. Row ops are keyed by problem id and coalesce. */
export type SyncOp =
  | { kind: "row"; problemId: string; body: PutProgressBody }
  | { kind: "plan"; startDate: string }
  | { kind: "prefs"; filters?: Partial<Filters>; celebratedMilestones?: number[] };

/** Compare two states and emit the minimal ops that turn `prev` into `next`. */
export function diffProgress(prev: Progress, next: Progress): SyncOp[] {
  const ops: SyncOp[] = [];

  const ids = new Set([
    ...Object.keys(prev.completed), ...Object.keys(next.completed),
    ...Object.keys(prev.notes), ...Object.keys(next.notes),
    ...Object.keys(prev.revision), ...Object.keys(next.revision),
  ]);
  for (const id of ids) {
    const body: PutProgressBody = {};
    const was = prev.completed[id];
    const is = next.completed[id];
    if (!was && is) {
      body.completed = true;
      body.localDate = is.date;
    } else if (was && !is) {
      body.completed = false;
    }
    if ((prev.notes[id] ?? null) !== (next.notes[id] ?? null)) body.note = next.notes[id] ?? null;
    if ((prev.revision[id] ?? null) !== (next.revision[id] ?? null)) body.revision = next.revision[id] ?? null;
    if (Object.keys(body).length > 0) ops.push({ kind: "row", problemId: id, body });
  }

  if (prev.startDate !== next.startDate) ops.push({ kind: "plan", startDate: next.startDate });

  const filters: Partial<Filters> = {};
  for (const k of Object.keys(next.prefs.filters) as (keyof Filters)[]) {
    if (prev.prefs.filters[k] !== next.prefs.filters[k]) (filters as Record<string, unknown>)[k] = next.prefs.filters[k];
  }
  const milestonesChanged = JSON.stringify(prev.prefs.celebratedMilestones) !== JSON.stringify(next.prefs.celebratedMilestones);
  if (Object.keys(filters).length > 0 || milestonesChanged) {
    ops.push({
      kind: "prefs",
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
      ...(milestonesChanged ? { celebratedMilestones: next.prefs.celebratedMilestones } : {}),
    });
  }
  return ops;
}

/** Re-apply a pending op on top of a (server) state. Used to replay unsent edits after loading a snapshot. */
export function applyOp(p: Progress, op: SyncOp, now = Date.now()): Progress {
  if (op.kind === "plan") return { ...p, startDate: op.startDate };
  if (op.kind === "prefs") {
    return {
      ...p,
      prefs: {
        ...p.prefs,
        filters: { ...p.prefs.filters, ...op.filters },
        celebratedMilestones: op.celebratedMilestones ?? p.prefs.celebratedMilestones,
      },
    };
  }
  const completed = { ...p.completed };
  const notes = { ...p.notes };
  const revision = { ...p.revision };
  const { problemId: id, body } = op;
  if (body.completed === true && body.localDate) completed[id] = completed[id] ?? { date: body.localDate, at: now };
  if (body.completed === false) delete completed[id];
  if (body.note !== undefined) {
    if (body.note) notes[id] = body.note;
    else delete notes[id];
  }
  if (body.revision !== undefined) {
    if (body.revision) revision[id] = body.revision;
    else delete revision[id];
  }
  return { ...p, completed, notes, revision };
}

/** Merge two ops of the same key into one (later fields win). */
export function mergeOps(a: SyncOp, b: SyncOp): SyncOp {
  if (a.kind === "row" && b.kind === "row") return { kind: "row", problemId: a.problemId, body: { ...a.body, ...b.body } };
  if (a.kind === "prefs" && b.kind === "prefs") {
    return {
      kind: "prefs",
      ...(a.filters || b.filters ? { filters: { ...a.filters, ...b.filters } } : {}),
      ...(a.celebratedMilestones || b.celebratedMilestones ? { celebratedMilestones: b.celebratedMilestones ?? a.celebratedMilestones } : {}),
    };
  }
  return b; // plan: last wins
}

export const opKey = (op: SyncOp) => (op.kind === "row" ? `row:${op.problemId}` : op.kind);
