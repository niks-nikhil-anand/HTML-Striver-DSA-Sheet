import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TopicsView } from "@/components/topics/topics-view";

export const metadata: Metadata = { title: "Topics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Topics" />
      <TopicsView />
    </>
  );
}
