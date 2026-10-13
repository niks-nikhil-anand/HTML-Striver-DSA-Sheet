"use client";

import { useMemo } from "react";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { activityByDay } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function ActivityChart({ days = 14 }: { days?: number }) {
  const { progress, today } = useTracker();
  const data = useMemo(() => activityByDay(progress.completed, today, days), [progress.completed, today, days]);
  const max = Math.max(2, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);

  return (
    <figure>
      <div
        role="img"
        aria-label={`Problems solved per day over the last ${days} days: ${total} in total`}
        className="flex h-32 items-end gap-1.5"
      >
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDate(d.date, { day: "numeric", month: "short" })}: ${d.count} solved`}>
            <div
              className={cn(
                "w-full rounded-t-md transition-[height] duration-500",
                d.count === 0 ? "bg-muted" : d.date === today ? "accent-fill" : "bg-primary/70",
              )}
              style={{ height: d.count === 0 ? "4px" : `${(d.count / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDate(data[0].date, { day: "numeric", month: "short" })}</span>
        <span>{total} solved in {days} days</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}
