import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MilestonesView } from "@/components/milestones/milestones-view";
import { MilestonesLoading } from "@/components/milestones/milestones-loading";

export const metadata: Metadata = { title: "Milestones" };
export default function Page() {
  return <><PageHeader title="Milestones" /><Suspense fallback={<MilestonesLoading />}><MilestonesView /></Suspense></>;
}
