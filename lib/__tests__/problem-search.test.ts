import { describe, expect, it } from "vitest";
import { matchesProblem, searchHighlights, searchProblems } from "@/lib/problem-search";
import { applyFilters } from "@/lib/filters";
import { DEFAULT_FILTERS, type Problem } from "@/lib/types";
const problem = (id: string, title: string, topic = "Arrays"): Problem => ({ id, title, topic, subtopic: "Practice", difficulty: "Easy", url: "https://example.com", tufUrl: "https://example.com" });
const problems = [problem("topic", "Rotated array", "Binary Search"), problem("contains", "Apply binary search"), problem("prefix", "Binary search on answers"), problem("exact", "Binary search")];
describe("global autocomplete", () => {
  it("ranks exact titles, title prefixes, title matches, then related topics", () => {
    expect(searchProblems(problems, " binary SEARCH ").map((p) => p.id)).toEqual(["exact", "prefix", "contains", "topic"]);
    expect(searchProblems(problems, " ")).toEqual([]);
  });
  it("matches multiple terms and keeps full-page results consistent", () => {
    expect(matchesProblem(problems[0], "rotated binary")).toBe(true);
    expect(matchesProblem(problems[0], "rotated tree")).toBe(false);
    const global = searchProblems(problems, "binary search").map((p) => p.id).sort();
    const page = applyFilters(problems, { ...DEFAULT_FILTERS, query: "binary search" }, { completed: {} }).map((p) => p.id).sort();
    expect(page).toEqual(global);
  });
  it("highlights repeated case-insensitive words without interpreting regex or HTML", () => {
    expect(searchHighlights("Array array", "array")).toEqual([{ text: "Array", match: true }, { text: " ", match: false }, { text: "array", match: true }]);
    expect(searchHighlights("a+b <script>", "a+b")).toEqual([{ text: "a+b", match: true }, { text: " <script>", match: false }]);
    expect(searchHighlights("Any title", "")).toEqual([{ text: "Any title", match: false }]);
  });
});
