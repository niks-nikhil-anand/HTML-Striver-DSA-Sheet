import { addDays } from "./dates";
import type { CompletionRecord, DayPlan, Problem } from "./types";

type Completed = Record<string, CompletionRecord>;

export const MILESTONES = [25, 50, 100, 250, 400] as const;

export function overallProgress(problems: readonly Problem[], completed: Completed) {
  const total = problems.length;
  const done = problems.reduce((n, p) => (completed[p.id] ? n + 1 : n), 0);
  return { total, done, pending: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function dayProgress(day: DayPlan | undefined, completed: Completed) {
  if (!day) return { done: 0, total: 0 };
  return { done: day.problemIds.filter((id) => completed[id]).length, total: day.problemIds.length };
}

export function isDayComplete(day: DayPlan, completed: Completed): boolean {
  const p = dayProgress(day, completed);
  return p.total > 0 && p.done === p.total;
}

export function topicProgress(problems: readonly Problem[], completed: Completed) {
  const map = new Map<string, { topic: string; total: number; done: number; pct: number }>();
  for (const p of problems) {
    const t = map.get(p.topic) ?? { topic: p.topic, total: 0, done: 0, pct: 0 };
    t.total++;
    if (completed[p.id]) t.done++;
    map.set(p.topic, t);
  }
  return [...map.values()].map((t) => ({ ...t, pct: Math.round((t.done / t.total) * 100) }));
}

/** Pending problems whose scheduled day is before today. Never reschedules. */
export function overdueIds(schedule: readonly DayPlan[], completed: Completed, today: string): string[] {
  return schedule.filter((d) => d.date < today).flatMap((d) => d.problemIds.filter((id) => !completed[id]));
}

/**
 * A "study day" is a calendar day on which at least one problem was ticked off.
 * The current streak survives until the end of today: if nothing is done yet
 * today, it still counts up to yesterday.
 */
export function computeStreaks(completionDates: readonly string[], today: string) {
  const days = [...new Set(completionDates)].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === addDays(days[i - 1], 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function streaksFromCompleted(completed: Completed, today: string) {
  return computeStreaks(Object.values(completed).map((c) => c.date), today);
}

export function recentlyCompleted(problems: readonly Problem[], completed: Completed, limit = 5): Problem[] {
  return problems
    .filter((p) => completed[p.id])
    .sort((a, b) => completed[b.id].at - completed[a.id].at)
    .slice(0, limit);
}

export function crossedMilestone(before: number, after: number): number | null {
  const hit = [...MILESTONES].reverse().find((m) => before < m && after >= m);
  return hit ?? null;
}

/** Completions per calendar day for the last `days` days, oldest first, ending today. */
export function activityByDay(completed: Completed, today: string, days = 14) {
  const counts = new Map<string, number>();
  for (const c of Object.values(completed)) counts.set(c.date, (counts.get(c.date) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, count: counts.get(date) ?? 0 };
  });
}

export function difficultyProgress(problems: readonly Problem[], completed: Completed) {
  return (["Easy", "Medium", "Hard"] as const).map((difficulty) => {
    const list = problems.filter((p) => p.difficulty === difficulty);
    const done = list.filter((p) => completed[p.id]).length;
    return { difficulty, total: list.length, done, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  });
}
