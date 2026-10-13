"use client";

import { useState } from "react";
import { CalendarCheck, RotateCcw, Trophy } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { QuoteCard } from "@/components/common/quote-card";
import { ProblemCard } from "@/components/problems/problem-card";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { PROBLEMS } from "@/lib/problems";
import { DIFFICULT_PROBLEM_QUOTES, dailyQuote } from "@/lib/quotes";

type Tab = "needs-revision" | "mastered" | "unmarked";

const TABS = [
  ["needs-revision", "Needs revision", RotateCcw],
  ["mastered", "Mastered", Trophy],
  ["unmarked", "Solved, unmarked", CalendarCheck],
] as const;

export function RevisionView() {
  const { progress, today } = useTracker();
  const [tab, setTab] = useState<Tab>("needs-revision");
  const solved = PROBLEMS.filter((p) => progress.completed[p.id]);
  const lists = {
    "needs-revision": PROBLEMS.filter((p) => progress.revision[p.id] === "needs-revision"),
    mastered: PROBLEMS.filter((p) => progress.revision[p.id] === "mastered"),
    unmarked: solved.filter((p) => !progress.revision[p.id]),
  };
  const list = lists[tab];

  return (
    <div className="grid gap-4">
      <QuoteCard label="Learn from every attempt" quote={dailyQuote(DIFFICULT_PROBLEM_QUOTES, today, 2)} />
      <div role="tablist" aria-label="Revision lists" className="flex flex-wrap gap-2">
        {TABS.map(([k, label, Icon]) => (
          <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "default" : "outline"} size="sm" onClick={() => setTab(k)}>
            <Icon /> {label} <span className="tabular-nums opacity-80">({lists[k].length})</span>
          </Button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={solved.length === 0 ? "Nothing to revise yet" : "This list is empty"}
          hint={solved.length === 0 ? "Solve some problems first, then flag them for revision or mark them mastered." : "Mark problems as Revise or Mastered from any problem card."}
        />
      ) : (
        <div className="grid gap-2.5 xl:grid-cols-2">
          {list.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </div>
      )}
    </div>
  );
}
