import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { StatsView } from "@/components/stats/stats-view";

export const metadata: Metadata = { title: "Statistics & Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Statistics & Analytics" />
      <StatsView />
    </>
  );
}
