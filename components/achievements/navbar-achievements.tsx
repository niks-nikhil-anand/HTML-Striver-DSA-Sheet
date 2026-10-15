"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { milestoneSummary } from "@/lib/milestones";
import { useState } from "react";
import { AchievementIcon } from "./achievement-icon";
import { Trophy } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Milestones } from "@/components/dashboard/milestones";
import { useTracker } from "@/hooks/use-tracker";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export function NavbarAchievements() {
  const [open, setOpen] = useState(false);
  const { achievements, overall, ready, highlightedAchievement } = useTracker();
  const earned = ACHIEVEMENTS.filter((m) => achievements.some((a) => a.tag === m.tag));
  const { latest, next } = milestoneSummary(overall.done, achievements);
  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip.Provider>
          {earned.slice(-3).map((m) => (
            <Tooltip.Root key={m.tag}>
              <Tooltip.Trigger onClick={() => setOpen(true)} aria-label={`${m.name}, ${m.tag}, ${m.threshold} of 452 solved, unlocked. View achievements`} className={cn("hidden size-8 place-items-center rounded-full border border-success/40 bg-success/10 text-success hover:bg-success/20 focus-visible:outline-2 focus-visible:outline-ring xl:grid", m.champion && "border-warning/50 bg-warning/10 text-warning", highlightedAchievement === m.tag && "motion-safe:animate-pulse")}>
                <AchievementIcon tag={m.tag} className="size-4" />
              </Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Positioner sideOffset={8}><Tooltip.Popup className="z-[70] max-w-60 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">{m.name}<br />{m.tag} · {m.threshold}/452 solved · Unlocked</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal>
            </Tooltip.Root>
          ))}
        </Tooltip.Provider>
        <button type="button" disabled={!ready} onClick={() => setOpen(true)} aria-label={`View achievements: ${earned.length} of 19 unlocked`} title="Achievements" className="relative grid size-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground hover:bg-accent disabled:opacity-50">
          <Trophy className="size-4 xl:hidden" /><span className="hidden text-xs font-medium xl:inline">{earned.length > 3 ? `+${earned.length - 3}` : `${earned.length}/19`}</span>
          {earned.length > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground xl:hidden">{earned.length}</span>}
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>DSA achievements</DialogTitle>
            <DialogDescription>{overall.done} / 452 solved · {earned.length} of 19 unlocked · {(overall.done / 452 * 100).toFixed(1)}% of the sheet completed. Earned badges are yours to keep.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 rounded-xl border bg-muted/40 p-3 text-sm sm:grid-cols-2">
            <p><span className="block text-xs text-muted-foreground">Latest achievement</span>{latest?.name ?? "Your first badge awaits"}</p>
            <p><span className="block text-xs text-muted-foreground">Next achievement</span>{next ? `${next.name} · ${Math.max(0, next.threshold - overall.done)} more solved` : "DSA Champion — all 19 unlocked!"}</p>
          </div>
          <Link href="/milestones" onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "sm" })}>View all milestones</Link>
          <Milestones />
        </DialogContent>
      </Dialog>
    </>
  );
}
