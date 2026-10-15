import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrackerProvider } from "@/providers/tracker-provider";
import { requireUser } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/errors";
import { safeReturnTo } from "@/lib/auth/session";

async function ProtectedTracker({ children }: { children: React.ReactNode }) {
  try { await requireUser(); }
  catch (error) {
    if (!(error instanceof ApiError) || error.code !== "UNAUTHENTICATED") throw error;
    const next = safeReturnTo((await headers()).get("x-dsa-return-to"));
    redirect(`/unlock?next=${encodeURIComponent(next)}`);
  }
  return <TrackerProvider><AppShell>{children}</AppShell></TrackerProvider>;
}
export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div role="status" className="grid min-h-screen place-items-center text-sm text-muted-foreground">Opening your tracker…</div>}><ProtectedTracker>{children}</ProtectedTracker></Suspense>;
}
