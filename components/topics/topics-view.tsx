"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, CheckCheck, Layers, Search, TrendingUp, X } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { ProgressRing } from "@/components/common/progress-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTracker } from "@/hooks/use-tracker";
import { filterTopics, topicStatus, type TopicStatus } from "@/lib/topic-cards";
import { cn } from "@/lib/utils";

const statuses: { value: TopicStatus; label: string }[] = [
  { value: "all", label: "All topics" },
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];
const statusStyle = {
  "not-started": "border-border bg-muted/60 text-muted-foreground",
  "in-progress": "border-primary/25 bg-primary/10 text-primary",
  completed: "border-success/25 bg-success/10 text-success",
};
const statusLabel = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed" };

export function TopicsView() {
  const router = useRouter();
  const { setFilters, topics } = useTracker();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TopicStatus>("all");
  const filtered = filterTopics(topics, query, status);
  const inProgress = topics.filter((topic) => topicStatus(topic) === "in-progress").length;
  const completed = topics.filter((topic) => topicStatus(topic) === "completed").length;
  const reset = () => { setQuery(""); setStatus("all"); };

  return (
    <div className="grid min-w-0 gap-5">
      <div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Explore the sheet by topic. Pick an area to practice, build on what you know, and see your progress grow.</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: "Total topics", value: topics.length, Icon: Layers, tone: "text-foreground" },
            { label: "In progress", value: inProgress, Icon: TrendingUp, tone: "text-primary" },
            { label: "Completed", value: completed, Icon: CheckCheck, tone: "text-success" },
          ].map(({ label, value, Icon, tone }) => (
            <div key={label} className="glass rounded-xl p-3 sm:p-4">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs"><Icon aria-hidden className="hidden size-3.5 sm:block" />{label}</dt>
              <dd className={cn("mt-1.5 font-heading text-2xl font-semibold tabular-nums sm:text-3xl", tone)}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input aria-label="Search topics" placeholder="Search topics…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pl-9 pr-10" />
            {query && <button type="button" aria-label="Clear topic search" onClick={() => setQuery("")} className="absolute right-0 top-0 grid size-10 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X aria-hidden className="size-4" /></button>}
          </div>
          <div role="group" aria-label="Filter topics by status" className="flex flex-wrap gap-1.5">
            {statuses.map((item) => (
              <button key={item.value} type="button" aria-pressed={status === item.value} onClick={() => setStatus(item.value)} className={cn("min-h-10 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", status === item.value ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground")}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <p role="status" className="mt-3 text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of {topics.length} topics · Sheet order</p>
      </Panel>

      {filtered.length === 0 ? (
        <Panel className="flex flex-col items-center gap-3 py-12 text-center">
          <Search aria-hidden className="size-7 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold">No topics match your filters</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Try another topic name or status to find what you want to practice.</p>
          <Button variant="outline" onClick={reset}>Clear filters</Button>
        </Panel>
      ) : (
        <ul aria-label="Topics" className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((topic) => {
            const state = topicStatus(topic);
            const remaining = Math.max(0, topic.total - topic.done);
            return (
              <li key={topic.topic} className="min-w-0">
                <button
                  type="button"
                  aria-label={`View ${topic.topic} problems: ${topic.done} of ${topic.total} solved, ${statusLabel[state]}`}
                  onClick={() => { setFilters({ topic: topic.topic }); router.push("/problems"); }}
                  className="glass group flex h-full min-h-[190px] w-full flex-col gap-2.5 rounded-xl border border-border p-4 text-left sm:p-5 transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-safe:hover:-translate-y-1 motion-reduce:transition-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", state === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                        {state === "completed" ? <CheckCheck aria-hidden className="size-4" /> : <BookOpen aria-hidden className="size-4" />}
                      </span>
                      <h2 className="min-w-0 font-heading text-base font-semibold leading-snug tracking-tight group-hover:text-primary">{topic.topic}</h2>
                    </div>
                    <ProgressRing value={topic.pct} size={48} stroke={4}>
                      <span className="text-xs font-semibold tabular-nums">{topic.pct}%</span>
                    </ProgressRing>
                  </div>
                  <span className={cn("self-start rounded-full border px-2.5 py-1 text-[10px] font-medium", statusStyle[state])}>{statusLabel[state]}</span>
                  <div className="mt-auto w-full border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="tabular-nums"><b className="font-semibold">{topic.done}</b><span className="text-muted-foreground"> / {topic.total} solved</span></span>
                      <span className={cn("text-[11px] tabular-nums", state === "completed" ? "text-success" : "text-muted-foreground")}>{remaining === 0 ? "All solved" : `${remaining} remaining`}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">View problems <ArrowUpRight aria-hidden className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" /></div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
