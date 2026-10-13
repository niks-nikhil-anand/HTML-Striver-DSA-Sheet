import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" showJump={false} srOnly />
      <DashboardView />
    </>
  );
}
