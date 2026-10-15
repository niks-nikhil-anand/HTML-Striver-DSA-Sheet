"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Search, Trophy, X } from "lucide-react";
import { MilestoneCard } from "@/components/achievements/milestone-card";
import { AchievementIcon } from "@/components/achievements/achievement-icon";
import { Panel } from "@/components/common/panel";
import { Bar } from "@/components/common/bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTracker } from "@/hooks/use-tracker";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { filterMilestones, milestoneStatus, milestoneSummary, type MilestoneStatus } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import { MilestonesLoading } from "./milestones-loading";

export function MilestonesView() {
  const params = useSearchParams();
  const { ready, overall, achievements, highlightedAchievement } = useTracker();
  const query = params.get("q") ?? "";
  const status = milestoneStatus(params.get("status"));
  const { earned, unlocked, latest, next, remaining } = milestoneSummary(overall.done, achievements);
  const filtered = filterMilestones(query, status, earned);
  const update = (patch: { q?: string; status?: MilestoneStatus }) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || (key === "status" && value === "all")) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };
  if (!ready) return <MilestonesLoading />;
  return (
    <div className="grid min-w-0 gap-5">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Every solved problem builds your skills. Follow your next goal and celebrate the achievements you’ve earned. Earned badges stay yours, even if you reset your progress.</p>
      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {[{ label: "Problems solved", value: `${overall.done} / 452` }, { label: "Sheet completed", value: `${(overall.done / 452 * 100).toFixed(1)}%` }, { label: "Milestones earned", value: `${unlocked.length} / ${ACHIEVEMENTS.length}` }].map((item) => <div key={item.label} className="glass min-w-0 rounded-xl p-3 sm:p-5"><dt className="text-[11px] text-muted-foreground sm:text-xs">{item.label}</dt><dd className="mt-2 font-heading text-lg font-semibold tabular-nums sm:text-3xl">{item.value}</dd></div>)}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="relative overflow-hidden border-primary/30">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-primary">{next ? "Your next milestone" : "All milestones unlocked"}</p><h2 className="mt-2 font-heading text-xl font-semibold">{next?.name ?? "DSA Champion"}</h2></div><Trophy aria-hidden className="size-7 shrink-0 text-primary" /></div>
          <p className="mt-2 text-sm text-muted-foreground">{next ? `${remaining} more problems to reach ${next.threshold} solved · ${next.tag}` : "You’ve earned all 19 achievements. Keep practicing and building on what you know."}</p>
          <Bar value={next ? Math.min(100, overall.done / next.threshold * 100) : 100} label={next ? `Progress toward ${next.name}` : "All achievements unlocked"} className="mt-5 h-2" />
          <Link href="/problems" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>Browse problems <ArrowUpRight aria-hidden /></Link>
        </Panel>
        <Panel>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest achievement</p>
          <div className="mt-3 flex items-center gap-3"><span className={cn("grid size-12 shrink-0 place-items-center rounded-full border", latest ? "border-success/35 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground")}>{latest ? <AchievementIcon tag={latest.tag} className="size-6" /> : <Trophy aria-hidden className="size-6" />}</span><div><h2 className="font-heading text-lg font-semibold">{latest?.name ?? "Your first badge awaits"}</h2><p className="mt-1 text-xs text-muted-foreground">{latest ? `${latest.tag} · Unlocked ${new Date(earned.get(latest.tag)!.unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "Solve 25 unique problems to earn DSA Beginner."}</p></div></div>
        </Panel>
      </div>
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm"><Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search milestones" placeholder="Search by name or tag…" value={query} onChange={(e) => update({ q: e.target.value })} className="h-10 pl-9 pr-10" />{query && <button type="button" aria-label="Clear milestone search" onClick={() => update({ q: "" })} className="absolute right-0 top-0 grid size-10 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X aria-hidden className="size-4" /></button>}</div>
          <div role="group" aria-label="Filter milestones by status" className="flex flex-wrap gap-1.5">{(["all", "unlocked", "locked"] as const).map((value) => <button key={value} type="button" aria-pressed={status === value} onClick={() => update({ status: value })} className={cn("min-h-10 rounded-lg border px-3 text-xs font-medium capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", status === value ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground")}>{value}</button>)}</div>
        </div>
        <p role="status" className="mt-3 text-xs text-muted-foreground">Showing {filtered.length} of {ACHIEVEMENTS.length} milestones · Ordered by problems required</p>
      </Panel>
      {filtered.length ? <ul aria-label="Milestones" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((m) => <MilestoneCard key={m.tag} milestone={m} award={earned.get(m.tag)} done={overall.done} latest={latest?.tag === m.tag} next={next?.tag === m.tag} highlight={highlightedAchievement === m.tag} spacious />)}</ul> : <Panel className="grid justify-items-center gap-3 py-12 text-center"><Search aria-hidden className="size-7 text-muted-foreground" /><h2 className="font-heading text-lg font-semibold">No milestones match your filters</h2><p className="text-sm text-muted-foreground">Try another name, tag, or unlock status.</p><Button variant="outline" onClick={() => update({ q: "", status: "all" })}>Clear filters</Button></Panel>}
    </div>
  );
}
