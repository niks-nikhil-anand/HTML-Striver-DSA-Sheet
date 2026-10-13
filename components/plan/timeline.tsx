"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { dayProgress } from "@/lib/stats";
import type { DayPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PROBLEMS } from "@/lib/problems";
import { ProblemCard } from "@/components/problems/problem-card";

type DayState = "complete" | "partial" | "overdue" | "today" | "upcoming";

function useDayState() {
  const { progress, today } = useTracker();
  return (d: DayPlan): DayState => {
    const p = dayProgress(d, progress.completed);
    if (p.total > 0 && p.done === p.total) return "complete";
    if (d.date === today) return "today";
    if (d.date < today) return "overdue";
    return p.done > 0 ? "partial" : "upcoming";
  };
}

const CHIP: Record<DayState, string> = {
  complete: "bg-success/20 text-success ring-success/40 dark:text-success",
  partial: "bg-warning/15 text-warning ring-warning/40 dark:text-warning",
  overdue: "bg-destructive/12 text-destructive ring-destructive/40 dark:text-destructive",
  today: "bg-primary/20 text-foreground ring-primary",
  upcoming: "bg-muted/60 text-muted-foreground ring-transparent hover:ring-border",
};

export function Timeline() {
  const { schedule, todayPlan, todayIndex, progress } = useTracker();
  const stateOf = useDayState();
  const defaultDay = todayPlan?.day ?? (todayIndex < 0 ? 1 : schedule.length);
  const [selected, setSelected] = useState<number | null>(null);
  const sel = schedule.find((d) => d.day === (selected ?? defaultDay)) ?? schedule[0];
  const byId = useMemo(() => new Map(PROBLEMS.map((p) => [p.id, p])), []);
  const todayRef = useRef<HTMLButtonElement | null>(null);

  const months = useMemo(() => {
    const g = new Map<string, DayPlan[]>();
    for (const d of schedule) {
      const k = d.date.slice(0, 7);
      g.set(k, [...(g.get(k) ?? []), d]);
    }
    return [...g.entries()];
  }, [schedule]);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  if (!sel) return null;
  const sp = dayProgress(sel, progress.completed);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {([
          ["complete", "Done"],
          ["today", "Today"],
          ["partial", "In progress"],
          ["overdue", "Overdue"],
          ["upcoming", "Upcoming"],
        ] as const).map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm ring-1 ring-inset", CHIP[k])} /> {label}
          </span>
        ))}
        {todayPlan && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setSelected(todayPlan.day); todayRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>
            <CalendarCheck /> Jump to today
          </Button>
        )}
      </div>

      <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
        {months.map(([key, days]) => (
          <div key={key}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {formatDate(`${key}-01`, { month: "long", year: "numeric" })}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(3.1rem,1fr))] gap-1.5">
              {days.map((d) => {
                const st = stateOf(d);
                const p = dayProgress(d, progress.completed);
                const isSel = d.day === sel.day;
                return (
                  <button
                    key={d.day}
                    ref={st === "today" ? todayRef : undefined}
                    type="button"
                    onClick={() => setSelected(d.day)}
                    aria-pressed={isSel}
                    aria-label={`${d.label}, ${formatDate(d.date)}, ${p.done} of ${p.total} done`}
                    className={cn(
                      "flex flex-col items-center rounded-lg px-1 py-1.5 text-[11px] leading-tight ring-1 ring-inset transition-all",
                      CHIP[st],
                      isSel && "outline-2 outline-offset-1 outline-primary",
                    )}
                  >
                    <span className="font-semibold">{d.date.slice(8)}</span>
                    <span className="opacity-80">{p.done}/{p.total}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {sel.label} <span className="font-normal text-muted-foreground">· {formatDate(sel.date)}</span>
          </h3>
          <span className="text-xs text-muted-foreground">{sp.done}/{sp.total} completed</span>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {sel.problemIds.map((id) => {
            const p = byId.get(id);
            return p ? <ProblemCard key={id} problem={p} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}
