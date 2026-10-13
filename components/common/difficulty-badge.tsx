import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

const DIFF_STYLE: Record<Difficulty, string> = {
  Easy: "bg-success/12 text-success ring-success/30",
  Medium: "bg-warning/12 text-warning ring-warning/30",
  Hard: "bg-destructive/12 text-destructive ring-destructive/30",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", DIFF_STYLE[difficulty])}>
      {difficulty}
    </span>
  );
}
