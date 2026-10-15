import { describe, expect, it } from "vitest";
import { activityLevel, buildActivityHeatmap } from "../activity-heatmap";

const record = (date: string) => ({ date, at: 1 });

describe("practice activity calendar", () => {
  it("limits 7-day and 30-day ranges inclusively across month and year boundaries", () => {
    for (const [range, start, count] of [["7d", "2025-12-29", 7], ["30d", "2025-12-06", 30]] as const) {
      const result = buildActivityHeatmap({ first: record(start), today: record("2026-01-04"), outside: record("2025-12-05") }, "2026-01-04", range);
      expect(result.start).toBe(start);
      expect(result.weeks.flat().filter(Boolean)).toHaveLength(count);
      expect(result.total).toBe(2);
      expect(result.activeDays).toBe(2);
    }
    expect(buildActivityHeatmap({}, "2024-03-01", "7d").weeks.flat().some((day) => day?.date === "2024-02-29")).toBe(true);
  });
  it("counts completion dates inside the rolling year and excludes future and invalid dates", () => {
    const result = buildActivityHeatmap({ a: record("2025-10-16"), b: record("2026-10-15"), c: record("2026-10-15"), old: record("2025-10-15"), future: record("2026-10-16"), invalid: record("2026-02-30") }, "2026-10-15");
    expect(result.start).toBe("2025-10-16");
    expect(result.total).toBe(3);
    expect(result.activeDays).toBe(2);
    expect(result.weeks.flat().find((day) => day?.date === "2026-10-15")).toMatchObject({ count: 2, level: 2 });
    expect(result.weeks.flat().filter(Boolean)).toHaveLength(365);
  });
  it("aligns columns Sunday to Saturday and pads outside the date range", () => {
    const result = buildActivityHeatmap({}, "2026-10-15");
    result.weeks.forEach((week) => week.forEach((day, weekday) => {
      if (day) expect(new Date(`${day.date}T00:00:00Z`).getUTCDay()).toBe(weekday);
    }));
    expect(result.weeks[0][0]).toBeNull();
    expect(result.weeks[result.weeks.length - 1][6]).toBeNull();
    expect(result.total).toBe(0);
  });
  it("includes leap day and handles a February 29 endpoint without date rollover", () => {
    const leap = buildActivityHeatmap({ a: record("2024-02-29") }, "2024-03-01");
    expect(leap.weeks.flat().filter(Boolean)).toHaveLength(366);
    expect(leap.total).toBe(1);
    expect(buildActivityHeatmap({}, "2024-02-29").start).toBe("2023-03-01");
  });
  it("handles year boundaries and provides distinct month keys", () => {
    const result = buildActivityHeatmap({}, "2026-01-01");
    expect(result.start).toBe("2025-01-02");
    expect(new Set(result.months.map((month) => month.key)).size).toBe(result.months.length);
    expect(result.months[result.months.length - 1].key).toBe("2026-01");
  });
  it("uses the planned five intensity levels", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(activityLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("recomputes the count when a completion is removed", () => {
    expect(buildActivityHeatmap({ a: record("2026-10-15") }, "2026-10-15").total).toBe(1);
    expect(buildActivityHeatmap({}, "2026-10-15").total).toBe(0);
  });
});
