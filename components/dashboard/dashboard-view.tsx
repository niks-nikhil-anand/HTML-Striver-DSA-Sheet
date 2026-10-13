"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Award, BarChart3, CalendarClock, CheckCircle2, Gauge, History } from "lucide-react";
import { DifficultyBadge } from "@/components/common/difficulty-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Panel } from "@/components/common/panel";
import { QuoteCard } from "@/components/common/quote-card";
import { SectionTitle } from "@/components/common/section-title";
import { Timeline } from "@/components/plan/timeline";
import { TopicBars } from "@/components/topics/topic-bars";
import { buttonVariants } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { PROBLEMS } from "@/lib/problems";
import { DASHBOARD_QUOTES, dailyQuote } from "@/lib/quotes";
import { recentlyCompleted } from "@/lib/stats";
import { ActivityChart } from "./activity-chart";
import { Hero } from "./hero";
import { Milestones } from "./milestones";
import { PosterCard } from "./poster-card";
import { StatCards } from "./stat-cards";
import { TodayPlan } from "./today-plan";

export function DashboardView() {
  const { schedule, todayPlan, today, progress, overdue, setFilters, problemById } = useTracker();
  const focusDay = todayPlan?.day;
  const upcoming = useMemo(() => schedule.filter((d) => d.date > today && d.day !== focusDay).slice(0, 4), [schedule, today, focusDay]);
  const recent = useMemo(() => recentlyCompleted(PROBLEMS, progress.completed, 5), [progress.completed]);

  return (
    <div className="grid gap-5">
      <Hero />
      <StatCards />

      {overdue.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          <span className="flex-1">
            <b>{overdue.length}</b> overdue problem{overdue.length === 1 ? "" : "s"} still pending. Your schedule is unchanged. Catch up when you can.
          </span>
          <Link
            href="/problems"
            className={buttonVariants({ size: "sm", variant: "outline" })}
            onClick={() => setFilters({ date: "overdue", status: "pending", difficulty: "All", topic: "All", query: "" })}
          >
            View overdue
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid content-start gap-5 lg:col-span-2">
          <TodayPlan />
          <QuoteCard label="Daily motivation" quote={dailyQuote(DASHBOARD_QUOTES, today)} />
          <Panel>
            <SectionTitle
              icon={<CalendarClock className="size-4 text-primary" />}
              title="Coming up next"
              action={<Link href="/plan" className={buttonVariants({ variant: "ghost", size: "sm" })}>Full plan</Link>}
            />
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing upcoming" hint="You're at the end of the schedule." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((d) => (
                  <li key={d.day} className="min-w-0 rounded-xl border border-border/50 bg-muted/40 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{d.label}</span>
                      <span>{formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                    <ul className="mt-2 grid gap-1.5">
                      {d.problemIds.map((id) => {
                        const p = problemById.get(id);
                        return p ? (
                          <li key={id} className="flex min-w-0 items-center justify-between gap-2">
                            <span className="min-w-0 truncate">{p.title}</span>
                            <DifficultyBadge difficulty={p.difficulty} />
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="grid content-start gap-5">
          <PosterCard />
          <Panel>
            <SectionTitle icon={<Award className="size-4 text-success" />} title="Milestones" />
            <Milestones compact />
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionTitle icon={<CalendarClock className="size-4 text-primary" />} title="Study calendar" />
        <Timeline />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            icon={<Gauge className="size-4 text-primary" />}
            title="Topic progress"
            action={<Link href="/topics" className={buttonVariants({ variant: "ghost", size: "sm" })}>All topics</Link>}
          />
          <TopicBars limit={8} />
        </Panel>
        <div className="grid content-start gap-5">
          <Panel>
            <SectionTitle
              icon={<BarChart3 className="size-4 text-primary" />}
              title="Recent activity"
              action={<Link href="/stats" className={buttonVariants({ variant: "ghost", size: "sm" })}>Analytics</Link>}
            />
            <ActivityChart />
          </Panel>
          <Panel>
            <SectionTitle icon={<History className="size-4 text-primary" />} title="Recently completed" />
            {recent.length === 0 ? (
              <EmptyState title="Nothing solved yet" hint="Tick off your first problem and it will show up here." />
            ) : (
              <ul className="grid gap-1.5">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                      <span className="truncate">{p.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(progress.completed[p.id].date, { day: "numeric", month: "short" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
