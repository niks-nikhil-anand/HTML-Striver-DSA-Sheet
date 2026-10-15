import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { filterMilestones, milestoneStatus, milestoneSummary } from "@/lib/milestones";

describe("milestone page state", () => {
  it("uses saved awards instead of optimistically unlocking from the current count", () => {
    const summary = milestoneSummary(25, []);
    expect(summary.unlocked).toHaveLength(0);
    expect(summary.next?.tag).toBe("DSA-025");
  });
  it.each([0, 24, 25, 100, 450, 452])("finds the correct next goal with %i saved completions", (count) => {
    const saved = ACHIEVEMENTS.filter((m) => m.threshold <= count).map((m) => ({ tag: m.tag, unlockedAt: "2026-10-15T00:00:00Z" }));
    const summary = milestoneSummary(count, saved);
    expect(summary.next?.threshold).toBe(ACHIEVEMENTS.find((m) => m.threshold > count)?.threshold);
    expect(summary.unlocked).toHaveLength(saved.length);
    expect(summary.remaining).toBe(summary.next ? summary.next.threshold - count : 0);
  });
  it("keeps historical awards and orders latest by unlock date", () => {
    const summary = milestoneSummary(0, [{ tag: "DSA-025", unlockedAt: "2026-10-15T00:00:00Z" }, { tag: "DSA-050", unlockedAt: "2026-10-14T00:00:00Z" }, { tag: "unknown", unlockedAt: "2026-10-16T00:00:00Z" }]);
    expect(summary.unlocked).toHaveLength(2);
    expect(summary.latest?.tag).toBe("DSA-025");
    expect(summary.next?.tag).toBe("DSA-075");
    expect(summary.remaining).toBe(75);
  });
  it("combines search and status filters without altering catalog order", () => {
    const { earned } = milestoneSummary(100, ACHIEVEMENTS.slice(0,4).map((m) => ({ tag: m.tag, unlockedAt: "2026-10-15T00:00:00Z" })));
    expect(filterMilestones(" dsa-100 ", "unlocked", earned).map((m) => m.name)).toEqual(["DSA Century"]);
    expect(filterMilestones("century", "locked", earned)).toEqual([]);
    expect(filterMilestones("", "unlocked", earned)).toHaveLength(4);
    expect(filterMilestones("", "locked", earned)).toHaveLength(15);
    expect(milestoneStatus("invalid")).toBe("all");
  });
});
