import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlanView } from "@/components/plan/plan-view";

export const metadata: Metadata = { title: "Daily Plan" };

export default function Page() {
  return (
    <>
      <PageHeader title="Daily Plan" />
      <PlanView />
    </>
  );
}
