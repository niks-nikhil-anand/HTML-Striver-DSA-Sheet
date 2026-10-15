import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { TopicsView } from "@/components/topics/topics-view";
import { useTracker } from "@/hooks/use-tracker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));
it("renders compact topic cards with responsive columns and database progress", () => {
  vi.mocked(useTracker).mockReturnValue({ topics: [
    { topic: "Strings (Basic and Medium)", total: 7, done: 1, pct: 14 },
    { topic: "Arrays", total: 32, done: 32, pct: 100 },
  ], setFilters: vi.fn() } as unknown as ReturnType<typeof useTracker>);
  const html = renderToStaticMarkup(createElement(TopicsView));
  expect(html).toContain("md:grid-cols-2 xl:grid-cols-3");
  expect(html).not.toContain("aspect-square");
  expect(html.match(/min-h-\[190px\]/g)).toHaveLength(2);
  expect(html).toContain("Search topics");
  expect(html).toContain("Filter topics by status");
  expect(html).toContain("6 remaining");
  expect(html).toContain("All solved");
  expect(html).toContain("View Strings (Basic and Medium) problems: 1 of 7 solved, In progress");
});
