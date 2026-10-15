import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProblemsView } from "@/components/problems/problems-view";
import { useTracker } from "@/hooks/use-tracker";
import { defaultProgress } from "@/lib/progress";
import { PROBLEMS } from "@/lib/problems";

vi.mock("@/hooks/use-tracker", () => ({ useTracker: vi.fn() }));

describe("problems page server rendering", () => {
  it("renders problem cards with API progress and no retired scheduling context", () => {
    const progress = defaultProgress();
    progress.completed[PROBLEMS[0].id] = { date: "2026-10-15", at: 1 };
    progress.notes[PROBLEMS[0].id] = "A saved note";
    progress.revision[PROBLEMS[0].id] = "mastered";
    vi.mocked(useTracker).mockReturnValue({
      progress, today: "2026-10-15", filters: progress.prefs.filters,
      filtered: PROBLEMS, setFilters: vi.fn(), clearFilters: vi.fn(),
      toggleComplete: vi.fn(), setNote: vi.fn(), setRevision: vi.fn(),
    } as unknown as ReturnType<typeof useTracker>);
    const html = renderToStaticMarkup(createElement(ProblemsView));
    expect(html.match(/<article/g)).toHaveLength(20);
    expect(html).toContain(PROBLEMS[0].title);
    expect(html).toContain("Solved ");
    expect(html).toContain("Notes");
    expect(html).toContain("Pagination");
    expect(html).not.toContain("Overdue");
    expect(html).not.toContain("Study day");
  });
});

it("restores the saved grid layout and sorting without browser storage", () => {
  const progress = defaultProgress();
  progress.prefs.ui!.problemLayout = "grid";
  progress.prefs.filters = { ...progress.prefs.filters, sort: "title", difficulty: "Hard", status: "pending", query: "tree" };
  vi.mocked(useTracker).mockReturnValue({
    progress, today: "2026-10-15", filters: progress.prefs.filters,
    filtered: [], setFilters: vi.fn(), clearFilters: vi.fn(), setUi: vi.fn(),
  } as unknown as ReturnType<typeof useTracker>);
  const html = renderToStaticMarkup(createElement(ProblemsView));
  expect(html).toContain('value="title" selected=""');
  expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Two per row/);
  expect(html).toContain('value="tree"');
});

it("renders the saved page and clamps a page beyond the remaining results", () => {
  const progress = defaultProgress();
  for (const [saved, expected] of [[3, 3], [999, Math.ceil(PROBLEMS.length / 20)]]) {
    progress.prefs.ui!.problemPage = saved;
    vi.mocked(useTracker).mockReturnValue({
      progress, today: "2026-10-15", filters: progress.prefs.filters,
      filtered: PROBLEMS, setFilters: vi.fn(), clearFilters: vi.fn(), setUi: vi.fn(),
      toggleComplete: vi.fn(), setNote: vi.fn(), setRevision: vi.fn(),
    } as unknown as ReturnType<typeof useTracker>);
    const html = renderToStaticMarkup(createElement(ProblemsView));
    const text = html.replace(/<[^>]*>/g, "");
    expect(text).toContain(`Page ${expected} of ${Math.ceil(PROBLEMS.length / 20)}`);
    expect(html.match(/<article/g)).toHaveLength(expected === 3 ? 20 : PROBLEMS.length % 20);
  }
});
