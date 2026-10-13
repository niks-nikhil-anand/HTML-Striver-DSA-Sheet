import { describe, expect, it } from "vitest";
import { addDays, diffDays, isIsoDate } from "../dates";
import { applyFilters, buildDayIndex, sortProblems } from "../filters";
import { PROBLEMS, PROBLEM_IDS } from "../problems";
import { currentDayIndex, generateSchedule } from "../schedule";
import { activityByDay, computeStreaks, difficultyProgress, crossedMilestone, dayProgress, overallProgress, overdueIds, topicProgress } from "../stats";
import {
  STORAGE_KEY,
  defaultProgress,
  exportProgress,
  loadProgress,
  parseImport,
  saveProgress,
  validateProgress,
} from "../storage";
import { DASHBOARD_QUOTES, DIFFICULT_PROBLEM_QUOTES, STREAK_QUOTES, dailyQuote } from "../quotes";
import { DEFAULT_FILTERS, type Problem } from "../types";

const mk = (id: string, topic: string, difficulty: Problem["difficulty"], title = id): Problem => ({
  id, title, topic, subtopic: "x", difficulty, url: "https://example.com", tufUrl: "https://example.com",
});
const P = [
  mk("a", "Arrays", "Easy", "Two Sum"),
  mk("b", "Binary Search", "Medium", "Search in rotated array"),
  mk("c", "Binary Search", "Hard", "Median of two arrays"),
  mk("d", "Binary Search", "Medium", "Floor and ceil"),
  mk("e", "Arrays", "Hard", "Merge intervals"),
];
const rec = (date: string, at = 1) => ({ date, at });

describe("dates", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-13", 18)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDays("2026-10-13", "2026-10-20")).toBe(7);
  });
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-10-13")).toBe(true);
    expect(isIsoDate(5)).toBe(false);
  });
});

describe("schedule", () => {
  it("starts Day 01 on 13 Oct 2026 with exactly two problems per day", () => {
    const s = generateSchedule(PROBLEMS);
    expect(s[0]).toMatchObject({ day: 1, label: "Day 01", date: "2026-10-13" });
    expect(s[1].date).toBe("2026-10-14");
    expect(s.every((d) => d.problemIds.length === 2)).toBe(true);
    expect(s).toHaveLength(PROBLEMS.length / 2);
    expect(s[s.length - 1].label).toBe(`Day ${s.length}`);
  });
  it("includes weekends and keeps sheet order", () => {
    const s = generateSchedule(PROBLEMS);
    expect(s.map((d) => d.date).slice(0, 7)).toEqual([
      "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19",
    ]);
    expect(s.flatMap((d) => d.problemIds)).toEqual(PROBLEMS.map((p) => p.id));
  });
  it("finds the current day", () => {
    const s = generateSchedule(PROBLEMS);
    expect(currentDayIndex(s, "2026-10-12")).toBe(-1);
    expect(currentDayIndex(s, "2026-10-13")).toBe(0);
    expect(currentDayIndex(s, "2026-10-15")).toBe(2);
    expect(currentDayIndex(s, "2030-01-01")).toBe(s.length);
  });
});

describe("dataset", () => {
  it("has unique ids, valid links and known difficulties", () => {
    expect(PROBLEM_IDS.size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) {
      expect(["Easy", "Medium", "Hard"]).toContain(p.difficulty);
      expect(p.url.startsWith("https://")).toBe(true);
      if (p.gfgUrl) expect(p.gfgUrl).toMatch(/^https:\/\/www\.geeksforgeeks\.org\/problems\//);
      if (p.leetcodeUrl) expect(p.leetcodeUrl).toMatch(/^https:\/\/leetcode\.com\/problems\/[^/#?]+\/$/);
      expect(p.url).toBe(p.leetcodeUrl ?? p.gfgUrl ?? p.tufUrl);
      if (p.javaSolutionUrl) expect(p.javaSolutionUrl).toMatch(/^https:\/\/github\.com\/Bharat2044\/Striver-A2Z-DSA-Sheet-Solution-using-JAVA\/blob\/main\//);
      if (p.solutionUrl) expect(p.solutionUrl).toMatch(/^https:\/\/github\.com\/Codensity30\/Strivers-A2Z-DSA-Sheet\/blob\/main\//);
    }
  });
});

describe("filters", () => {
  const schedule = generateSchedule(P, "2026-10-13");
  const completed = { a: rec("2026-10-13"), b: rec("2026-10-13") };
  const ctx = { dayOf: buildDayIndex(schedule), completed, today: "2026-10-14" };

  it("combines difficulty + topic + status", () => {
    const out = applyFilters(P, { ...DEFAULT_FILTERS, difficulty: "Medium", topic: "Binary Search", status: "pending" }, ctx);
    expect(out.map((p) => p.id)).toEqual(["d"]);
  });
  it("searches by name case-insensitively", () => {
    expect(applyFilters(P, { ...DEFAULT_FILTERS, query: "MEDIAN" }, ctx).map((p) => p.id)).toEqual(["c"]);
  });
  it("filters by date buckets", () => {
    const f = (date: string) => applyFilters(P, { ...DEFAULT_FILTERS, date: date as never }, ctx).map((p) => p.id);
    expect(f("today")).toEqual(["c", "d"]);
    expect(f("upcoming")).toEqual(["e"]);
    expect(f("completed-days")).toEqual(["a", "b"]);
    expect(f("overdue")).toEqual([]);
  });
  it("sorts without mutating", () => {
    expect(sortProblems(P, "difficulty", {}).map((p) => p.difficulty)).toEqual(["Easy", "Medium", "Medium", "Hard", "Hard"]);
    expect(sortProblems(P, "status", completed).map((p) => p.id).slice(0, 3)).toEqual(["c", "d", "e"]);
    expect(P[0].id).toBe("a");
  });
});

describe("progress", () => {
  it("computes overall, day and topic progress", () => {
    const completed = { a: rec("2026-10-13"), c: rec("2026-10-13") };
    expect(overallProgress(P, completed)).toEqual({ total: 5, done: 2, pending: 3, pct: 40 });
    expect(overallProgress([], {}).pct).toBe(0);
    const s = generateSchedule(P);
    expect(dayProgress(s[0], completed)).toEqual({ done: 1, total: 2 });
    expect(topicProgress(P, completed).find((t) => t.topic === "Binary Search")).toMatchObject({ total: 3, done: 1, pct: 33 });
  });
  it("lists overdue pending problems without rescheduling", () => {
    const s = generateSchedule(P);
    expect(overdueIds(s, { a: rec("2026-10-13") }, "2026-10-15")).toEqual(["b", "c", "d"].slice(0, 3));
    expect(s[1].date).toBe("2026-10-14");
  });
  it("detects milestones", () => {
    expect(crossedMilestone(24, 25)).toBe(25);
    expect(crossedMilestone(25, 26)).toBeNull();
    expect(crossedMilestone(99, 100)).toBe(100);
  });
});

describe("analytics helpers", () => {
  it("builds a fixed-length activity window ending today", () => {
    const a = activityByDay({ a: rec("2026-10-14"), b: rec("2026-10-14"), c: rec("2026-10-10") }, "2026-10-15", 7);
    expect(a).toHaveLength(7);
    expect(a[0].date).toBe("2026-10-09");
    expect(a[6]).toEqual({ date: "2026-10-15", count: 0 });
    expect(a.find((d) => d.date === "2026-10-14")!.count).toBe(2);
    expect(a.find((d) => d.date === "2026-10-10")!.count).toBe(1);
  });
  it("summarises progress per difficulty", () => {
    const r = difficultyProgress(P, { a: rec("2026-10-13"), c: rec("2026-10-13") });
    expect(r).toEqual([
      { difficulty: "Easy", total: 1, done: 1, pct: 100 },
      { difficulty: "Medium", total: 2, done: 0, pct: 0 },
      { difficulty: "Hard", total: 2, done: 1, pct: 50 },
    ]);
  });
});

describe("quotes", () => {
  it("has the requested number of quotes per category", () => {
    expect([DASHBOARD_QUOTES.length, DIFFICULT_PROBLEM_QUOTES.length, STREAK_QUOTES.length]).toEqual([8, 7, 7]);
  });
  it("picks deterministically per date (hydration-safe) and always from the list", () => {
    expect(dailyQuote(DASHBOARD_QUOTES, "2026-10-13")).toBe(dailyQuote(DASHBOARD_QUOTES, "2026-10-13"));
    for (const d of ["2026-10-13", "2026-12-31", "2027-05-26"]) {
      for (const off of [0, 1, 2, 3]) expect(STREAK_QUOTES).toContain(dailyQuote(STREAK_QUOTES, d, off));
    }
  });
  it("rotates day to day and offsets avoid repeats on one page", () => {
    expect(dailyQuote(DASHBOARD_QUOTES, "2026-10-13")).not.toBe(dailyQuote(DASHBOARD_QUOTES, "2026-10-14"));
    expect(dailyQuote(STREAK_QUOTES, "2026-10-13", 0)).not.toBe(dailyQuote(STREAK_QUOTES, "2026-10-13", 1));
  });
});

describe("streaks", () => {
  it("counts consecutive days and keeps streak alive until end of today", () => {
    const dates = ["2026-10-13", "2026-10-13", "2026-10-14", "2026-10-15"];
    expect(computeStreaks(dates, "2026-10-15")).toEqual({ current: 3, longest: 3 });
    expect(computeStreaks(dates, "2026-10-16")).toEqual({ current: 3, longest: 3 });
    expect(computeStreaks(dates, "2026-10-17")).toEqual({ current: 0, longest: 3 });
  });
  it("tracks the longest run separately from the current one", () => {
    const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"];
    expect(computeStreaks(dates, "2026-10-11")).toEqual({ current: 2, longest: 4 });
    expect(computeStreaks([], "2026-10-11")).toEqual({ current: 0, longest: 0 });
  });
});

function fakeStorage(initial?: string) {
  const m = new Map<string, string>();
  if (initial !== undefined) m.set(STORAGE_KEY, initial);
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("storage", () => {
  it("round-trips progress", () => {
    const p = defaultProgress();
    p.completed.a = rec("2026-10-13", 5);
    p.notes.a = "use hashmap";
    p.revision.a = "mastered";
    const st = fakeStorage();
    expect(saveProgress(st, p)).toBe(true);
    const { progress, corrupted } = loadProgress(st);
    expect(corrupted).toBe(false);
    expect(progress).toEqual(p);
  });
  it("falls back safely on corrupted or invalid data", () => {
    expect(loadProgress(fakeStorage("{not json")).corrupted).toBe(true);
    expect(loadProgress(fakeStorage('{"version":2}')).progress).toEqual(defaultProgress());
    expect(loadProgress(fakeStorage()).corrupted).toBe(false);
    expect(loadProgress(null).progress.startDate).toBe("2026-10-13");
  });
  it("survives a throwing storage", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
    expect(loadProgress(bad).corrupted).toBe(true);
    expect(saveProgress(bad, defaultProgress())).toBe(false);
  });
  it("validates imports and rejects bad schemas", () => {
    const good = JSON.parse(exportProgress(defaultProgress()));
    expect(validateProgress(good)).not.toBeNull();
    expect(validateProgress({ ...good, startDate: "nope" })).toBeNull();
    expect(validateProgress({ ...good, completed: { a: { date: "bad", at: 1 } } })).toBeNull();
    expect(validateProgress({ ...good, revision: { a: "weird" } })).toBeNull();
    expect(parseImport("garbage")).toBeNull();
    expect(parseImport("[]")).toBeNull();
  });
  it("still loads data saved by the single-page prototype (prefs.view is ignored)", () => {
    const old = { ...JSON.parse(exportProgress(defaultProgress())), prefs: { view: "problems", filters: {}, celebratedMilestones: [25] } };
    const out = validateProgress(old);
    expect(out).not.toBeNull();
    expect(out!.prefs).not.toHaveProperty("view");
    expect(out!.prefs.celebratedMilestones).toEqual([25]);
  });
  it("drops unknown problem ids on import", () => {
    const p = defaultProgress();
    p.completed.a = rec("2026-10-13");
    p.completed.ghost = rec("2026-10-13");
    const out = parseImport(exportProgress(p), new Set(["a"]));
    expect(Object.keys(out!.completed)).toEqual(["a"]);
  });
});
