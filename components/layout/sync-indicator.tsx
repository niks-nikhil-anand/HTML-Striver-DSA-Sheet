"use client";

import { Cloud, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";

/** Shows where changes are going: server (Saved / Saving / Offline) or this device only (guest). Hidden when sync is off. */
export function SyncIndicator() {
  const { sync, retrySave } = useTracker();
  if (!sync.enabled) return null;

  let icon = <Cloud className="size-3.5" />;
  let label = "Saved";
  let tone = "text-success border-success/35 bg-success/10";

  if (sync.mode === "unauthenticated") {
    label = "Tracker locked";
    tone = "text-destructive";
  } else if (sync.mode === "unknown") {
    icon = <Loader2 className="size-3.5 animate-spin" />;
    label = "Connecting…";
    tone = "text-muted-foreground border-border bg-card/60";
  } else if (sync.state === "saving") {
    icon = <Loader2 className="size-3.5 animate-spin" />;
    label = "Saving…";
    tone = "text-primary border-primary/35 bg-primary/10";
  } else if (sync.state === "offline") {
    icon = <CloudOff className="size-3.5" />;
    label = `Offline${sync.pending ? ` · ${sync.pending} pending` : ""}`;
    tone = "text-warning border-warning/35 bg-warning/10";
  } else if (sync.state === "error") {
    icon = <TriangleAlert className="size-3.5" />;
    label = "Some changes weren't saved";
    tone = "text-destructive border-destructive/35 bg-destructive/10";
  }

  return (
    <button
      type="button"
      onClick={retrySave}
      disabled={sync.state !== "error" && sync.state !== "offline"}
      aria-live="polite"
      title={label}
      className={cn("hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium lg:inline-flex", tone)}
    >
      {icon} {label}{(sync.state === "error" || sync.state === "offline") && " · Retry"}
    </button>
  );
}
