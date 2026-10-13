"use client";

import { useMemo } from "react";
import { Award, BarChart3, Flame, Layers, Target } from "lucide-react";
import { Bar } from "@/components/common/bar";
import { Panel } from "@/components/common/panel";
import { QuoteCard } from "@/components/common/quote-card";
import { ProgressRing } from "@/components/common/progress-ring";
import { SectionTitle } from "@/components/common/section-title";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Milestones } from "@/components/dashboard/milestones";
import { TopicBars } from "@/components/topics/topic-bars";
import { useTracker } from "@/hooks/use-tracker";
import { PROBLEMS } from "@/lib/problems";
import { STREAK_QUOTES, dailyQuote } from "@/lib/quotes";
import { difficultyProgress } from "@/lib/stats";
import { cn } from "@/lib/utils";

const DIFF_TONE = { Easy: "text-success", Medium: "text-warning", Hard: "text-destructive" } as const;

export function StatsView() {
  const { overall, streaks, progress, schedule, todayIndex, overdue, today } = useTracker();
  const diff = useMemo(() => difficultyProgress(PROBLEMS, progress.completed), [progress.completed]);
  const revised = Object.values(progress.revision);
  const notes = Object.keys(progress.notes).length;
  const daysElapsed = Math.max(0, Math.min(todayIndex + 1, schedule.length));
  const expected = daysElapsed * 2;
  const onTrack = overall.done - expected;

  return (
    <div className="grid gap-5">
      <QuoteCard label="Build your streak" quote={dailyQuote(STREAK_QUOTES, today, 2)} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="flex items-center gap-5">
          <ProgressRing value={overall.pct} size={112} stroke={9}>
            <span className="font-heading text-2xl font-semibold tabular-nums">{overall.pct}%</span>
          </ProgressRing>
          <div className="text-sm">
            <p className="font-heading text-lg font-semibold tabular-nums">{overall.done}/{overall.total}</p>
            <p className="text-muted-foreground">problems solved</p>
            <p className={cn("mt-1 text-xs font-medium", onTrack >= 0 ? "text-success" : "text-warning")}>
              {daysElapsed === 0 ? "Plan hasn't started" : onTrack >= 0 ? `${onTrack} ahead of schedule` : `${-onTrack} behind schedule`}
            </p>
          </div>
        </Panel>
        <Panel>
          <SectionTitle icon={<Flame className="size-4 text-warning" />} title="Streaks" />
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="font-heading text-3xl font-semibold tabular-nums">{streaks.current}</div>
              <div className="text-xs text-muted-foreground">current (days)</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="font-heading text-3xl font-semibold tabular-nums">{streaks.longest}</div>
              <div className="text-xs text-muted-foreground">longest (days)</div>
            </div>
          </div>
        </Panel>
        <Panel>
          <SectionTitle icon={<Target className="size-4 text-primary" />} title="Workflow" />
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Overdue</dt><dd className="text-right font-medium tabular-nums">{overdue.length}</dd>
            <dt className="text-muted-foreground">Needs revision</dt><dd className="text-right font-medium tabular-nums">{revised.filter((r) => r === "needs-revision").length}</dd>
            <dt className="text-muted-foreground">Mastered</dt><dd className="text-right font-medium tabular-nums">{revised.filter((r) => r === "mastered").length}</dd>
            <dt className="text-muted-foreground">Problems with notes</dt><dd className="text-right font-medium tabular-nums">{notes}</dd>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionTitle icon={<BarChart3 className="size-4 text-primary" />} title="Activity · last 30 days" />
          <ActivityChart days={30} />
        </Panel>
        <Panel>
          <SectionTitle icon={<Layers className="size-4 text-secondary" />} title="By difficulty" />
          <ul className="grid gap-4">
            {diff.map((d) => (
              <li key={d.difficulty}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className={cn("font-medium", DIFF_TONE[d.difficulty])}>{d.difficulty}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{d.done}/{d.total} · {d.pct}%</span>
                </div>
                <Bar value={d.pct} label={`${d.difficulty} progress`} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={<Award className="size-4 text-success" />} title="Milestones" />
        <Milestones />
      </Panel>

      <Panel>
        <SectionTitle title="All topics" />
        <TopicBars />
      </Panel>
    </div>
  );
}
