import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProblemsView } from "@/components/problems/problems-view";

export const metadata: Metadata = { title: "All Problems" };

export default function Page() {
  return (
    <>
      <PageHeader title="All Problems" />
      <ProblemsView />
    </>
  );
}
