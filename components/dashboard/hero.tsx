"use client";

import Link from "next/link";
import { ArrowRight, Play, Target } from "lucide-react";
import { ProgressRing } from "@/components/common/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { diffDays, formatDate } from "@/lib/dates";
import { dayProgress } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { HeroArt } from "./hero-art";

function message(opts: { done: number; total: number; streak: number; before: boolean; finished: boolean }) {
  if (opts.finished) return "You've reached the end of the plan. Revise, refine and celebrate.";
  if (opts.before) return "Your plan hasn't started yet. Get ready to build the habit.";
  if (opts.total > 0 && opts.done === opts.total) return "Mission complete. Today's goal is done. Rest, then return tomorrow.";
  if (opts.done === 1) return "One down, one to go. Finish strong.";
  if (opts.streak >= 3) return `${opts.streak}-day streak. Don't break the chain today.`;
  return "Two problems stand between you and a great day.";
}

export function Hero() {
  const { schedule, todayPlan, todayIndex, today, progress, streaks } = useTracker();
  const before = todayIndex < 0;
  const finished = todayIndex >= schedule.length && schedule.length > 0;
  const dp = dayProgress(todayPlan, progress.completed);
  const eyebrow = before
    ? `Starts ${formatDate(schedule[0]?.date ?? today)}`
    : finished
      ? "Plan complete"
      : `${todayPlan?.label} of ${schedule.length} · ${formatDate(today)}`;
  const headline = before
    ? `Day 01 begins in ${diffDays(today, schedule[0].date)} day${diffDays(today, schedule[0].date) === 1 ? "" : "s"}`
    : finished
      ? "You finished the A2Z sheet"
      : "Two problems. One day. Keep the chain alive.";

  const startToday = () => {
    const target = document.getElementById("today-plan");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    const first = target?.querySelector<HTMLElement>('[role="checkbox"][aria-checked="false"], [role="checkbox"]');
    window.setTimeout(() => first?.focus({ preventScroll: true }), 400);
  };

  return (
    <section aria-labelledby="hero-title" className="glass rise relative isolate overflow-hidden rounded-3xl">
      <HeroArt className="absolute inset-y-0 right-0 -z-10 h-full w-full opacity-90 [mask-image:linear-gradient(to_right,transparent_5%,#000_70%)] md:w-[68%] md:[mask-image:linear-gradient(to_right,transparent,#000_55%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/75 to-transparent md:via-background/55" />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
            <Target className="size-3.5" /> {eyebrow}
          </p>
          <h2 id="hero-title" className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span className="accent-text">{headline}</span>
          </h2>
          <p className="mt-3 text-sm text-foreground/80 sm:text-base">{message({ done: dp.done, total: dp.total, streak: streaks.current, before, finished })}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!finished && (
              <button type="button" onClick={startToday} className={cn(buttonVariants({ size: "lg" }), "accent-fill h-11 gap-2 px-5 text-sm text-white shadow-glow hover:opacity-90 dark:shadow-[0_0_24px_-6px_var(--primary)]")}>
                <Play className="size-4" /> Start Today&apos;s Plan
              </button>
            )}
            <Link href="/plan" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 bg-card/60 px-5 text-sm backdrop-blur")}>
              View Full Plan <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="glass flex items-center gap-4 self-start rounded-2xl p-4 lg:flex-col lg:items-center">
          <ProgressRing value={todayPlan ? (dp.done / Math.max(dp.total, 1)) * 100 : 0} size={116} stroke={9}>
            <div>
              <div className="font-heading text-3xl font-semibold tabular-nums">{todayPlan ? `${dp.done}/${dp.total}` : "–"}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">today</div>
            </div>
          </ProgressRing>
          <div className="text-xs text-muted-foreground lg:text-center">
            Daily target
            <div className="font-medium text-foreground">2 problems</div>
          </div>
        </div>
      </div>
    </section>
  );
}
