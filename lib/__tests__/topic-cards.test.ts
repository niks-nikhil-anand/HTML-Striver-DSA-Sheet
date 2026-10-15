import { describe, expect, it } from "vitest";
import { filterTopics, topicStatus } from "../topic-cards";

const topics = [
  { topic: "Arrays", done: 0, total: 32, pct: 0 },
  { topic: "Binary Search", done: 1, total: 33, pct: 3 },
  { topic: "Binary Trees", done: 39, total: 39, pct: 100 },
];
describe("topic cards", () => {
  it("derives status from actual solved counts, not rounded percentages", () => {
    expect(topics.map(topicStatus)).toEqual(["not-started", "in-progress", "completed"]);
    expect(topicStatus({ topic: "Large", done: 199, total: 200, pct: 100 })).toBe("in-progress");
    expect(topicStatus({ topic: "Empty", done: 0, total: 0, pct: 0 })).toBe("not-started");
  });
  it("combines case-insensitive search and status while preserving sheet order", () => {
    expect(filterTopics(topics, " BINARY ", "all").map((topic) => topic.topic)).toEqual(["Binary Search", "Binary Trees"]);
    expect(filterTopics(topics, "binary", "in-progress")).toEqual([topics[1]]);
    expect(filterTopics(topics, "", "completed")).toEqual([topics[2]]);
    expect(filterTopics(topics, "", "not-started")).toEqual([topics[0]]);
    expect(filterTopics(topics, "arrays", "completed")).toEqual([]);
    expect(filterTopics(topics, "", "all")).toEqual(topics);
  });
});
