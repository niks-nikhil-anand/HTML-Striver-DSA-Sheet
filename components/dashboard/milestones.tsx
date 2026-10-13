"use client";

import { Award, Lock } from "lucide-react";
import { Bar } from "@/components/common/bar";
import { useTracker } from "@/hooks/use-tracker";
import { MILESTONES } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function Milestones({ compact = false }: { compact?: boolean }) {
  const { overall } = useTracker();
  const next = MILESTONES.find((m) => overall.done < m);
  const list = compact ? MILESTONES.filter((m) => m <= (next ?? Infinity)).slice(-3) : MILESTONES;

  return (
    <ul className={cn("grid gap-2.5", !compact && "sm:grid-cols-2 lg:grid-cols-5")}>
      {list.map((m) => {
        const unlocked = overall.done >= m;
        return (
          <li key={m} className={cn("rounded-xl border p-3", unlocked ? "border-success/40 bg-success/8" : "border-border bg-card/40")}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                {unlocked ? <Award className="size-4 text-success" aria-hidden /> : <Lock className="size-4 text-muted-foreground" aria-hidden />}
                {m} solved
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{Math.min(overall.done, m)}/{m}</span>
            </div>
            <Bar value={(Math.min(overall.done, m) / m) * 100} label={`${m} problems milestone`} className="mt-2" />
          </li>
        );
      })}
    </ul>
  );
}
