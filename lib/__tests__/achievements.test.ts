import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, eligibleAchievements } from "@/lib/achievements";

describe("achievement catalog", () => {
  it("has 19 stable, distinct milestones ending at the full 452 sheet", () => {
    expect(ACHIEVEMENTS).toHaveLength(19);
    expect(new Set(ACHIEVEMENTS.map((m) => m.tag)).size).toBe(19);
    expect(ACHIEVEMENTS.at(-1)).toEqual({ name: "DSA Champion", threshold: 452, tag: "DSA-452", champion: true });
  });
  it("unlocks exactly at each boundary and excludes permanent awards", () => {
    for (const milestone of ACHIEVEMENTS) {
      expect(eligibleAchievements(milestone.threshold - 1, new Set()).some((m) => m.tag === milestone.tag)).toBe(false);
      expect(eligibleAchievements(milestone.threshold, new Set()).some((m) => m.tag === milestone.tag)).toBe(true);
      expect(eligibleAchievements(452, new Set([milestone.tag])).some((m) => m.tag === milestone.tag)).toBe(false);
    }
  });
});
