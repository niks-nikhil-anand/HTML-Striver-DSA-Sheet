import { addDays } from "./dates";
import type { DayPlan, Problem } from "./types";

export const DEFAULT_START_DATE = "2026-10-13";
export const PROBLEMS_PER_DAY = 2;

export function dayLabel(day: number): string {
  return `Day ${String(day).padStart(2, "0")}`;
}

/**
 * Lay problems out in sheet order, `perDay` per calendar day (weekends
 * included), starting on `startDate`. Pure and independent of progress, so
 * ticking problems never moves anything.
 */
export function generateSchedule(
  problems: readonly Problem[],
  startDate: string = DEFAULT_START_DATE,
  perDay: number = PROBLEMS_PER_DAY,
): DayPlan[] {
  const plan: DayPlan[] = [];
  for (let i = 0; i < problems.length; i += perDay) {
    const day = i / perDay + 1;
    plan.push({
      day,
      label: dayLabel(day),
      date: addDays(startDate, day - 1),
      problemIds: problems.slice(i, i + perDay).map((p) => p.id),
    });
  }
  return plan;
}

/**
 * 0-based index of today's plan entry; -1 before the start date,
 * schedule.length once the plan is finished.
 */
export function currentDayIndex(schedule: readonly DayPlan[], today: string): number {
  if (schedule.length === 0) return -1;
  if (today < schedule[0].date) return -1;
  const idx = schedule.findIndex((d) => d.date === today);
  return idx === -1 ? schedule.length : idx;
}
