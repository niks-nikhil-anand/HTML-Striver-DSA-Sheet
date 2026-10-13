"use client";

import { useRouter } from "next/navigation";
import { Panel } from "@/components/common/panel";
import { SectionTitle } from "@/components/common/section-title";
import { useTracker } from "@/hooks/use-tracker";
import { TopicBars } from "./topic-bars";

export function TopicsView() {
  const router = useRouter();
  const { setFilters, clearFilters, topics } = useTracker();
  return (
    <Panel>
      <SectionTitle title={`Topic-wise progress · ${topics.length} topics`} />
      <p className="mb-3 text-xs text-muted-foreground">Select a topic to see its problems.</p>
      <TopicBars
        onSelect={(topic) => {
          clearFilters();
          setFilters({ topic });
          router.push("/problems");
        }}
      />
    </Panel>
  );
}
