import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Milestones } from "@/components/dashboard/milestones";
import { NavbarAchievements } from "@/components/achievements/navbar-achievements";
import { ACHIEVEMENTS } from "@/lib/achievements";
vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));
import { useTracker } from "@/hooks/use-tracker";

describe("achievement presentation", () => {
  it("shows historical earned awards after a reset, with remaining milestones locked", () => {
    vi.mocked(useTracker).mockReturnValue({ overall: { done: 0 }, achievements: [{ tag: "DSA-025", unlockedAt: "2026-10-15T00:00:00Z" }], ready: true } as ReturnType<typeof useTracker>);
    const html = renderToStaticMarkup(createElement(Milestones));
    expect(html).toContain("DSA Beginner: unlocked");
    expect(html).toContain("Building Consistency: locked");
    for (const milestone of ACHIEVEMENTS) expect(html).toContain(milestone.tag);
    expect(html).not.toContain("animate-pulse");
  });
  it("renders only earned navbar badges and collapses overflow into a count", () => {
    vi.mocked(useTracker).mockReturnValue({ overall: { done: 452 }, achievements: ACHIEVEMENTS.map((m) => ({ tag: m.tag, unlockedAt: "2026-10-15T00:00:00Z" })), ready: true, highlightedAchievement: "DSA-452" } as ReturnType<typeof useTracker>);
    const html = renderToStaticMarkup(createElement(NavbarAchievements));
    expect(html).toContain("View achievements: 19 of 19 unlocked");
    expect(html).toContain("DSA Champion, DSA-452");
    expect(html).toContain("+16");
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toContain("DSA Beginner, DSA-025");
  });
});
