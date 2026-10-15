export interface TopicProgress {
  topic: string;
  total: number;
  done: number;
  pct: number;
}
export type TopicStatus = "all" | "not-started" | "in-progress" | "completed";

export function topicStatus(topic: TopicProgress): Exclude<TopicStatus, "all"> {
  if (topic.total > 0 && topic.done >= topic.total) return "completed";
  return topic.done > 0 ? "in-progress" : "not-started";
}

/** Keep the official sheet order while combining the two page controls. */
export function filterTopics(topics: readonly TopicProgress[], query: string, status: TopicStatus) {
  const search = query.trim().toLowerCase();
  return topics.filter((topic) => topic.topic.toLowerCase().includes(search) && (status === "all" || topicStatus(topic) === status));
}
