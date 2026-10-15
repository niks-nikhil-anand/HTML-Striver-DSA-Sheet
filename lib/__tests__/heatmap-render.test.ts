import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { defaultProgress } from "@/lib/progress";
import { useTracker } from "@/hooks/use-tracker";

vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));
it("renders database-loaded completion dates with accessible detail and one tabbable day", () => {
  const progress = defaultProgress();
  progress.completed = { a: { date: "2026-10-15", at: 1 }, b: { date: "2026-10-15", at: 2 } };
  vi.mocked(useTracker).mockReturnValue({ progress, today: "2026-10-15" } as ReturnType<typeof useTracker>);
  const html = renderToStaticMarkup(createElement(ActivityHeatmap));
  expect(html).toContain("2 problems solved");
  expect(html).toContain("across 1 active day");
  expect(html).toContain('data-date="2026-10-15" data-level="2"');
  expect(html.match(/tabindex="-1"/g)).toHaveLength(364);
  expect(html).toContain("overflow-x-auto");
  expect(html).toContain("Last 7 days");
  expect(html).toContain("Last 30 days");
  expect(html).toContain("Last 12 months");
});

it("restores the selected range from database preferences", () => {
  const progress = defaultProgress();
  progress.prefs.ui!.activityRange = "7d";
  vi.mocked(useTracker).mockReturnValue({ progress, today: "2026-10-15" } as ReturnType<typeof useTracker>);
  const html = renderToStaticMarkup(createElement(ActivityHeatmap));
  expect(html.match(/data-date=/g)).toHaveLength(7);
  expect(html).toContain('value="7d" selected=""');
});
