import type { Problem } from "./types";

/** Shared matching keeps autocomplete and its full-results page consistent. */
export function matchesProblem(problem: Problem, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${problem.title} ${problem.topic} ${problem.subtopic}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
export function searchProblems(problems: readonly Problem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (p: Problem) => {
    const title = p.title.toLowerCase();
    return title === q ? 0 : title.startsWith(q) ? 1 : title.includes(q) ? 2 : 3;
  };
  return problems.filter((p) => matchesProblem(p, q)).sort((a, b) => rank(a) - rank(b));
}
export function searchHighlights(text: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const hits = terms.map((term) => ({ term, start: lower.indexOf(term, cursor) })).filter((hit) => hit.start >= 0).sort((a, b) => a.start - b.start || b.term.length - a.term.length);
    const hit = hits[0];
    if (!hit) { parts.push({ text: text.slice(cursor), match: false }); break; }
    if (hit.start > cursor) parts.push({ text: text.slice(cursor, hit.start), match: false });
    parts.push({ text: text.slice(hit.start, hit.start + hit.term.length), match: true });
    cursor = hit.start + hit.term.length;
  }
  return parts;
}
