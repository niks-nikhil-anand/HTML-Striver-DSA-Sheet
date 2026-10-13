"use client";

import { useTracker } from "@/hooks/use-tracker";
import { Bar } from "@/components/common/bar";

export function TopicBars({ limit, onSelect }: { limit?: number; onSelect?: (topic: string) => void }) {
  const { topics } = useTracker();
  // On the dashboard, surface topics in progress first, then the rest in sheet order.
  const list = limit
    ? [...topics].sort((a, b) => Number(b.done > 0 && b.done < b.total) - Number(a.done > 0 && a.done < a.total)).slice(0, limit)
    : topics;
  return (
    <ul className="grid gap-3">
      {list.map((t) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{t.topic}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {t.done}/{t.total} · {t.pct}%
              </span>
            </div>
            <Bar value={t.pct} label={`${t.topic} progress`} />
          </>
        );
        return (
          <li key={t.topic}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(t.topic)} className="block w-full rounded-lg p-1 text-left transition-colors hover:bg-muted/40">
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
