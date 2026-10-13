import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuoteCard({ label, quote, className }: { label: string; quote: string; className?: string }) {
  return (
    <aside aria-label={label} className={cn("glass rise overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-secondary/8 p-4 shadow-sm sm:p-5 dark:shadow-[0_12px_30px_-22px_rgba(99,102,241,0.65)]", className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Quote className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
          <blockquote className="mt-1 text-sm font-medium leading-relaxed text-foreground sm:text-base">“{quote}”</blockquote>
        </div>
      </div>
    </aside>
  );
}
