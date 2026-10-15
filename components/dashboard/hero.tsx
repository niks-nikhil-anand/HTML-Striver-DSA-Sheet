"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { ProgressRing } from "@/components/common/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HeroArt } from "./hero-art";

export function Hero() {
  const { overall, today, streaks } = useTracker();
  const headline = overall.done === overall.total ? "You finished the A2Z sheet" : "Your pace. Your progress.";
  const description = streaks.current > 0
    ? `${streaks.current}-day streak. Keep building your understanding, one problem at a time.`
    : "Choose a problem, practice at your own pace, and track what you learn.";
  return (
    <section aria-labelledby="hero-title" className="glass rise relative isolate overflow-hidden rounded-3xl">
      <HeroArt className="absolute inset-y-0 right-0 -z-10 h-full w-full opacity-90 [mask-image:linear-gradient(to_right,transparent_5%,#000_70%)] md:w-[68%] md:[mask-image:linear-gradient(to_right,transparent,#000_55%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/75 to-transparent md:via-background/55" />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
            <Target className="size-3.5" /> {formatDate(today)}
          </p>
          <h2 id="hero-title" className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span className="accent-text">{headline}</span>
          </h2>
          <p className="mt-3 text-sm text-foreground/80 sm:text-base">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/problems" className={cn(buttonVariants({ size: "lg" }), "accent-fill h-11 gap-2 px-5 text-sm text-white shadow-glow hover:opacity-90")}>
              Browse problems <ArrowRight className="size-4" />
            </Link>
            <Link href="/revision" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 bg-card/60 px-5 text-sm")}>
              Review solved problems
            </Link>
          </div>
        </div>
        <div className="glass flex items-center gap-4 self-start rounded-2xl p-4 lg:flex-col lg:items-center">
          <ProgressRing value={overall.pct} size={116} stroke={9}>
            <div>
              <div className="font-heading text-3xl font-semibold tabular-nums">{`${overall.pct}%`}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">completed</div>
            </div>
          </ProgressRing>
          <div className="text-xs text-muted-foreground lg:text-center">
            Overall progress
            <div className="font-medium text-foreground">{overall.done} of {overall.total} solved</div>
          </div>
        </div>
      </div>
    </section>
  );
}
