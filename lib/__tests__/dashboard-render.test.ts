import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { defaultProgress } from "@/lib/progress";
import { StatCards } from "@/components/dashboard/stat-cards";

vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));
import { useTracker } from "@/hooks/use-tracker";

describe("dashboard statistics rendering", () => {
  it("renders without a daily plan and counts only actual completions today", () => {
    const progress = defaultProgress();
    progress.completed = {
      a: { date: "2026-10-15", at: 1 },
      b: { date: "2026-10-15", at: 2 },
      c: { date: "2026-10-14", at: 3 },
    };
    vi.mocked(useTracker).mockReturnValue({
      progress, today: "2026-10-15",
      overall: { total: 452, done: 3, pending: 449, pct: 1 },
      streaks: { current: 2, longest: 2 },
    } as ReturnType<typeof useTracker>);
    const html = renderToStaticMarkup(createElement(StatCards));
    expect(html).toContain("problems solved today");
    expect(html).toMatch(/>Today<[\s\S]*?>2<[\s\S]*?problems solved today/);
    expect(html).not.toContain("nothing scheduled");
    expect(html).toContain("Longest: 2 days");
  });
});
