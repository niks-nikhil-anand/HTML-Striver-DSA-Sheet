import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UnlockForm } from "@/components/auth/unlock-form";
import { pinConfig, safeReturnTo } from "@/lib/auth/session";
import { sessionUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Welcome, Nikhil", robots: { index: false, follow: false } };
async function Unlock({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeReturnTo(params.next);
  if (await sessionUser()) redirect(next);
  return <UnlockForm configured={!!pinConfig()} returnTo={next} />;
}
export default function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<div role="status" className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Opening your private space…</div>}><Unlock searchParams={searchParams} /></Suspense>;
}
