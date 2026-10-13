"use client";

import { CheckCircle2, Flame, Gauge, Hourglass, ListChecks, Target, type LucideIcon } from "lucide-react";
import { Bar } from "@/components/common/bar";
import { useTracker } from "@/hooks/use-tracker";
import { dayProgress } from "@/lib/stats";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, tone, bar, barLabel }: { icon: LucideIcon; label: string; value: string | number; sub: string; tone: string; bar?: number; barLabel?: string }) {
  return (
    <div className="glass rise lift flex min-h-[8.5rem] flex-col rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg bg-current/10", tone)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 font-heading text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-auto pt-2 text-xs text-muted-foreground">{sub}</div>
      {bar !== undefined && <Bar value={bar} label={barLabel ?? label} className="mt-2" />}
    </div>
  );
}

export function StatCards() {
  const { overall, streaks, todayPlan, progress } = useTracker();
  const dp = dayProgress(todayPlan, progress.completed);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard icon={ListChecks} label="Total problems" value={overall.total} sub="in the A2Z plan" tone="text-primary" />
      <StatCard icon={CheckCircle2} label="Completed" value={overall.done} sub="problems solved" tone="text-success" />
      <StatCard icon={Hourglass} label="Pending" value={overall.pending} sub="still to go" tone="text-warning" />
      <StatCard icon={Gauge} label="Completion" value={`${overall.pct}%`} sub="of the full sheet" tone="text-secondary" bar={overall.pct} barLabel="Overall completion" />
      <StatCard icon={Flame} label="Streak" value={`${streaks.current}d`} sub={`Longest: ${streaks.longest} day${streaks.longest === 1 ? "" : "s"}`} tone="text-warning" />
      <StatCard
        icon={Target}
        label="Today"
        value={todayPlan ? `${dp.done}/${dp.total}` : "–"}
        sub={todayPlan ? (dp.done === dp.total ? "Goal complete" : "problems solved") : "nothing scheduled"}
        tone="text-success"
        bar={todayPlan ? (dp.done / Math.max(dp.total, 1)) * 100 : 0}
        barLabel="Today's progress"
      />
    </div>
  );
}
