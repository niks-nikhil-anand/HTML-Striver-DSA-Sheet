import { Lock, CheckCircle2 } from "lucide-react";
import { AchievementIcon } from "./achievement-icon";
import { Bar } from "@/components/common/bar";
import type { ACHIEVEMENTS, AchievementDTO } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export function MilestoneCard({ milestone: m, award, done, latest = false, next = false, highlight = false, spacious = false }: {
  milestone: (typeof ACHIEVEMENTS)[number]; award?: AchievementDTO; done: number;
  latest?: boolean; next?: boolean; highlight?: boolean; spacious?: boolean;
}) {
  return (
    <li className={cn("flex min-w-0 flex-col rounded-xl border p-3", spacious && "gap-2 p-5", award ? m.champion ? "border-warning/50 bg-warning/10" : "border-success/40 bg-success/8" : next ? "border-primary/50 bg-primary/5" : "border-border bg-card/40", highlight && "motion-safe:animate-pulse")}>
      <div className="flex items-start gap-2.5">
        <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-full border", spacious && "size-12", award ? m.champion ? "border-warning/40 text-warning" : "border-success/40 text-success" : "border-border text-muted-foreground")}>
          {award || spacious ? <AchievementIcon tag={m.tag} className={spacious ? "size-6" : "size-5"} /> : <Lock className="size-4" aria-hidden />}
          {!award && spacious && <Lock aria-hidden className="absolute -bottom-1 -right-1 size-4 rounded-full bg-card p-0.5" />}
        </span>
        <div className="min-w-0"><h3 className={cn("text-sm font-medium", spacious && "font-heading text-base font-semibold")}>{m.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{m.tag} · {m.threshold}/452 solved</p></div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {spacious && <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1", award ? "border-success/30 text-success" : "border-border text-muted-foreground")}>{award ? <CheckCircle2 aria-hidden className="size-3" /> : <Lock aria-hidden className="size-3" />}{award ? "Unlocked" : "Locked"}</span>}
        {latest && <span className="font-medium text-primary">Latest achievement</span>}
        {next && spacious && <span className="font-medium text-primary">Next milestone</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{award ? <>Unlocked <time dateTime={award.unlockedAt}>{new Date(award.unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time></> : `${Math.max(0, m.threshold - done)} more to unlock`}</p>
      <Bar value={award ? 100 : Math.min(100, done / m.threshold * 100)} label={`${m.name}: ${award ? "unlocked" : "locked"}`} className="mt-3" />
    </li>
  );
}
