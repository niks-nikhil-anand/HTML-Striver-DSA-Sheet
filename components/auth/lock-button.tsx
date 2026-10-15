"use client";

import { useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";

export function LockButton({ compact = false }: { compact?: boolean }) {
  const { lockTracker, busy } = useTracker();
  const [locking, setLocking] = useState(false);
  return <button type="button" disabled={locking || busy} aria-label="Lock tracker" title="Lock tracker" onClick={async () => {
    setLocking(true);
    try { await lockTracker(); window.location.replace("/unlock"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to lock. Try again."); setLocking(false); }
  }} className={cn("flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50", compact && "px-0")}>
    {locking ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <LockKeyhole aria-hidden className="size-4" />}<span className={cn(compact && "sr-only")}>{locking ? "Saving and locking…" : "Lock tracker"}</span>
  </button>;
}
