import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MilestonesView } from "@/components/milestones/milestones-view";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { NAV_ITEMS, isActive } from "@/components/layout/nav-items";
vi.mock("next/navigation", () => ({ useSearchParams: vi.fn() }));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));
import { useSearchParams } from "next/navigation";
import { useTracker } from "@/hooks/use-tracker";
function render(params = "", done = 25, ready = true) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(params) as ReturnType<typeof useSearchParams>);
  vi.mocked(useTracker).mockReturnValue({ ready, overall: { done }, achievements: [{ tag: "DSA-025", unlockedAt: "2026-10-15T00:00:00Z" }] } as ReturnType<typeof useTracker>);
  return renderToStaticMarkup(createElement(MilestonesView));
}
describe("milestones page rendering", () => {
  it("renders all 19 cards, summary, and responsive layout", () => {
    const html = render();
    for (const m of ACHIEVEMENTS) expect(html).toContain(m.tag);
    expect(html).toContain("25 / 452");
    expect(html).toContain("5.5%");
    expect(html).toContain("1 / 19");
    expect(html).toContain("sm:grid-cols-2 xl:grid-cols-3");
    expect(html).toContain("DSA Beginner: unlocked");
    expect(html).toContain("Building Consistency: locked");
  });
  it("restores filters from URL and offers reset for an empty view", () => {
    expect(render("status=unlocked")).not.toContain("Building Consistency: locked");
    const html = render("q=century&status=unlocked");
    expect(html).toContain("No milestones match your filters");
    expect(html).toContain("Clear filters");
  });
  it("shows a skeleton rather than locked awards before readiness", () => {
    const html = render("",0,false);
    expect(html).toContain("Loading milestones");
    expect(html).not.toContain("DSA-025");
  });
  it("preserves earned cards after reset and includes active navigation", () => {
    expect(render("status=unlocked",0)).toContain("DSA Beginner: unlocked");
    expect(NAV_ITEMS.some((m) => m.href === "/milestones")).toBe(true);
    expect(isActive("/milestones", "/milestones")).toBe(true);
  });
});
