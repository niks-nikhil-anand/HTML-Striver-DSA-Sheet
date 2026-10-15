"use client";

import { MilestoneCard } from "@/components/achievements/milestone-card";
import { useTracker } from "@/hooks/use-tracker";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { milestoneSummary } from "@/lib/milestones";
import { cn } from "@/lib/utils";

export function Milestones({ compact = false }: { compact?: boolean }) {
  const { overall, achievements = [], highlightedAchievement } = useTracker();
  const { earned, unlocked, latest, next } = milestoneSummary(overall.done, achievements);
  const list = compact ? [...unlocked.slice(-2), ...(next ? [next] : [])] : ACHIEVEMENTS;
  return <ul className={cn("grid gap-2.5", !compact && "sm:grid-cols-2 lg:grid-cols-3")}>
    {list.map((m) => <MilestoneCard key={m.tag} milestone={m} award={earned.get(m.tag)} done={overall.done} latest={latest?.tag === m.tag} next={next?.tag === m.tag} highlight={highlightedAchievement === m.tag} />)}
  </ul>;
}
