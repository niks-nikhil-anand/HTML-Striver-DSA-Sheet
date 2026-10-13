"use client";

import { PartyPopper, Target } from "lucide-react";
import { Bar } from "@/components/common/bar";
import { EmptyState } from "@/components/common/empty-state";
import { Panel } from "@/components/common/panel";
import { QuoteCard } from "@/components/common/quote-card";
import { ProblemCard } from "@/components/problems/problem-card";
import { useTracker } from "@/hooks/use-tracker";
import { DIFFICULT_PROBLEM_QUOTES, dailyQuote } from "@/lib/quotes";
import { dayProgress } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function TodayPlan() {
  const { schedule, todayPlan, todayIndex, progress, problemById, today } = useTracker();
  const before = todayIndex < 0;
  const focus = todayPlan ?? (before ? schedule[0] : undefined);
  const dp = dayProgress(focus, progress.completed);
  // A Hard problem on the plan gets a "difficult problem" quote right where you will meet it.
  const hasHard = !!focus && focus.problemIds.some((id) => problemById.get(id)?.difficulty === "Hard") && dp.done < dp.total;
  const complete = !!todayPlan && dp.total > 0 && dp.done === dp.total;

  return (
    <Panel className={cn("scroll-mt-24", complete && "celebrate border-success/40")}>
      <div id="today-plan" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Target className="size-5 text-primary" aria-hidden />
              {before ? "Up next" : "Today's plan"}
              {focus && <span className="text-sm font-normal text-muted-foreground">· {focus.label}</span>}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Exactly two problems a day. Tick them off as you solve.</p>
          </div>
          {focus && (
            <div className="w-full sm:w-56" aria-live="polite">
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">Daily progress</span>
                <span className={cn("font-heading text-lg font-semibold tabular-nums", complete && "text-success")}>
                  {dp.done}/{dp.total}
                </span>
              </div>
              <Bar value={(dp.done / Math.max(dp.total, 1)) * 100} label="Daily progress" />
            </div>
          )}
        </div>

        {complete && (
          <div role="status" className="pulse-once mb-4 flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm">
            <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
            <span>
              <b className="text-success">Day complete.</b> Both problems solved. That is how streaks are built.
            </span>
          </div>
        )}

        {hasHard && (
          <QuoteCard className="mb-4" label="A tough one today" quote={dailyQuote(DIFFICULT_PROBLEM_QUOTES, today, 3)} />
        )}

        {focus ? (
          <div className="grid gap-3 md:grid-cols-2">
            {focus.problemIds.map((id) => {
              const p = problemById.get(id);
              return p ? <ProblemCard key={id} problem={p} prominent /> : null;
            })}
          </div>
        ) : (
          <EmptyState title="No problems scheduled for today" hint="The plan has finished. Use Revision to revisit what you solved." />
        )}
      </div>
    </Panel>
  );
}
