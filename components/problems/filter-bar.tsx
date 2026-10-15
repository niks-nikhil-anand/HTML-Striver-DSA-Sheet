"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTracker } from "@/hooks/use-tracker";
import { hasActiveFilters } from "@/lib/filters";
import { TOPICS } from "@/lib/problems";
import { cn } from "@/lib/utils";

const selectCls =
  "h-10 w-full rounded-xl border border-input bg-card/60 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      {label}
      {children}
    </label>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, tone }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; tone?: (v: T) => string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors",
              on ? cn("bg-card text-foreground shadow-sm ring-1 ring-primary/40", tone?.(o.value)) : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const DIFF_TONE = (v: string) => (v === "Easy" ? "text-success" : v === "Medium" ? "text-warning" : v === "Hard" ? "text-destructive" : "");

export function FilterBar({ total }: { total: number }) {
  const { filters, setFilters, clearFilters, filtered } = useTracker();
  const active = hasActiveFilters(filters);

  const chips: { label: string; clear: () => void }[] = [];
  if (filters.difficulty !== "All") chips.push({ label: filters.difficulty, clear: () => setFilters({ difficulty: "All" }) });
  if (filters.topic !== "All") chips.push({ label: filters.topic, clear: () => setFilters({ topic: "All" }) });
  if (filters.status !== "all") chips.push({ label: filters.status === "completed" ? "Completed" : "Pending", clear: () => setFilters({ status: "all" }) });
  if (filters.query.trim()) chips.push({ label: `“${filters.query.trim()}”`, clear: () => setFilters({ query: "" }) });

  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <Field label="Search by title" className="lg:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
            <Input value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} placeholder="e.g. rotated sorted array" className="h-10 rounded-xl pl-9" aria-label="Search problems by title" />
          </div>
        </Field>
        <div className="grid gap-1.5 lg:col-span-4">
          <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
          <Segmented
            label="Difficulty"
            value={filters.difficulty}
            onChange={(v) => setFilters({ difficulty: v })}
            tone={DIFF_TONE}
            options={[{ value: "All", label: "All" }, { value: "Easy", label: "Easy" }, { value: "Medium", label: "Medium" }, { value: "Hard", label: "Hard" }]}
          />
        </div>
        <div className="grid gap-1.5 lg:col-span-4">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Segmented
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters({ status: v })}
            options={[{ value: "all", label: "All" }, { value: "completed", label: "Completed" }, { value: "pending", label: "Pending" }]}
          />
        </div>
        <Field label="Topic" className="lg:col-span-12">
          <select className={selectCls} value={filters.topic} onChange={(e) => setFilters({ topic: e.target.value })}>
            <option value="All">All topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto" aria-label="Active filters">
          <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{filtered.length}</span> of {total} match
          </p>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              aria-label={`Remove filter ${c.label}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {c.label} <X className="size-3" aria-hidden />
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={clearFilters} disabled={!active}>
          <X /> Clear filters
        </Button>
      </div>
    </div>
  );
}
