import type { CompletionRecord, Filters, Problem } from "./types";

export interface FilterContext {
  completed: Record<string, CompletionRecord>;
}

export function applyFilters(problems: readonly Problem[], f: Filters, ctx: FilterContext): Problem[] {
  const q = f.query.trim().toLowerCase();
  return problems.filter((p) => {
    if (f.difficulty !== "All" && p.difficulty !== f.difficulty) return false;
    if (f.topic !== "All" && p.topic !== f.topic) return false;
    const done = !!ctx.completed[p.id];
    if (f.status === "completed" && !done) return false;
    if (f.status === "pending" && done) return false;
    if (q && !p.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2 } as const;

export function sortProblems(
  list: readonly Problem[],
  sort: Filters["sort"],
  completed: Record<string, CompletionRecord>,
): Problem[] {
  const order = new Map(list.map((p, i) => [p.id, i]));
  const byOrder = (a: Problem, b: Problem) => order.get(a.id)! - order.get(b.id)!;
  const out = [...list];
  switch (sort) {
    case "title":
      return out.sort((a, b) => a.title.localeCompare(b.title) || byOrder(a, b));
    case "difficulty":
      return out.sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] || byOrder(a, b));
    case "topic":
      return out.sort((a, b) => a.topic.localeCompare(b.topic) || byOrder(a, b));
    case "status":
      return out.sort((a, b) => Number(!!completed[a.id]) - Number(!!completed[b.id]) || byOrder(a, b));
    default:
      return out;
  }
}

export function hasActiveFilters(f: Filters): boolean {
  return f.difficulty !== "All" || f.topic !== "All" || f.status !== "all" || f.query.trim() !== "";
}
