import { addDays, diffDays, isIsoDate } from "./dates";
import type { CompletionRecord } from "./types";

export type ActivityRange = "year" | "30d" | "7d";

export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
}

/** A selected date range, inclusive of today, using the same date-only keys as streaks. */
export function buildActivityHeatmap(completed: Record<string, CompletionRecord>, today: string, range: ActivityRange = "year") {
  const end = new Date(`${today}T00:00:00Z`);
  const year = end.getUTCFullYear() - 1;
  const month = end.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anniversary = new Date(Date.UTC(year, month, Math.min(end.getUTCDate(), lastDay))).toISOString().slice(0, 10);
  const start = range === "year" ? addDays(anniversary, 1) : addDays(today, range === "30d" ? -29 : -6);
  const counts = new Map<string, number>();
  for (const record of Object.values(completed)) {
    if (isIsoDate(record.date) && record.date >= start && record.date <= today) counts.set(record.date, (counts.get(record.date) ?? 0) + 1);
  }
  const gridStart = addDays(start, -new Date(`${start}T00:00:00Z`).getUTCDay());
  const weekCount = Math.ceil((diffDays(gridStart, today) + 1) / 7);
  const weeks = Array.from({ length: weekCount }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const date = addDays(gridStart, week * 7 + weekday);
    return date < start || date > today ? null : { date, count: counts.get(date) ?? 0, level: activityLevel(counts.get(date) ?? 0) };
  }));
  const seenMonths = new Set<string>();
  const months: { key: string; label: string; week: number }[] = [];
  weeks.forEach((week, index) => {
    for (const day of week) {
      if (!day) continue;
      const key = day.date.slice(0, 7);
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        months.push({ key, label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), week: index });
      }
    }
  });
  return { start, end: today, weeks, months, total: [...counts.values()].reduce((sum, n) => sum + n, 0), activeDays: counts.size };
}
