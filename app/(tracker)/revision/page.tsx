import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RevisionView } from "@/components/revision/revision-view";

export const metadata: Metadata = { title: "Revision" };

export default function Page() {
  return (
    <>
      <PageHeader title="Revision" />
      <RevisionView />
    </>
  );
}
