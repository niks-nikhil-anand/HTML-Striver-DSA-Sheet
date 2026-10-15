import { describe, expect, it } from "vitest";
import { addDays, diffDays, isIsoDate } from "../dates";
import { applyFilters, sortProblems } from "../filters";
import { PROBLEMS, PROBLEM_IDS } from "../problems";
import { activityByDay, computeStreaks, difficultyProgress, crossedMilestone, overallProgress, topicProgress } from "../stats";
import {
  defaultProgress,
  exportProgress,
  parseImport,
  validateProgress,
} from "../progress";
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
  const completed = { a: rec("2026-10-13"), b: rec("2026-10-13") };
  const ctx = { completed };

  it("combines difficulty + topic + status", () => {
    const out = applyFilters(P, { ...DEFAULT_FILTERS, difficulty: "Medium", topic: "Binary Search", status: "pending" }, ctx);
    expect(out.map((p) => p.id)).toEqual(["d"]);
  });
  it("searches by name case-insensitively", () => {
    expect(applyFilters(P, { ...DEFAULT_FILTERS, query: "MEDIAN" }, ctx).map((p) => p.id)).toEqual(["c"]);
  });
  it("normalizes retired schedule filters without hiding problems", () => {
    for (const date of ["today", "upcoming", "completed-days", "overdue"]) {
      const progress = defaultProgress();
      const imported = validateProgress({ ...progress, prefs: { ...progress.prefs, filters: { ...DEFAULT_FILTERS, date } } });
      expect(imported!.prefs.filters.date).toBe("all");
      expect(applyFilters(P, imported!.prefs.filters, ctx)).toHaveLength(P.length);
    }
  });
  it("sorts without mutating", () => {
    expect(sortProblems(P, "difficulty", {}).map((p) => p.difficulty)).toEqual(["Easy", "Medium", "Medium", "Hard", "Hard"]);
    expect(sortProblems(P, "status", completed).map((p) => p.id).slice(0, 3)).toEqual(["c", "d", "e"]);
    expect(P[0].id).toBe("a");
  });
});

describe("progress", () => {
  it("computes overall and topic progress", () => {
    const completed = { a: rec("2026-10-13"), c: rec("2026-10-13") };
    expect(overallProgress(P, completed)).toEqual({ total: 5, done: 2, pending: 3, pct: 40 });
    expect(overallProgress([], {}).pct).toBe(0);
    expect(topicProgress(P, completed).find((t) => t.topic === "Binary Search")).toMatchObject({ total: 3, done: 1, pct: 33 });
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

describe("progress format", () => {
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
