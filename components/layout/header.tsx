"use client";

import Link from "next/link";
import { CalendarDays, Flame, Menu } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { GlobalSearch } from "./global-search";
import { SyncIndicator } from "./sync-indicator";
import { ThemeToggle } from "./theme-toggle";

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { today, todayPlan, todayIndex, schedule, streaks } = useTracker();
  const dayBadge = todayPlan ? todayPlan.label : todayIndex < 0 ? "Not started" : "Plan done";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card/60 text-foreground hover:bg-accent md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="hidden min-w-0 shrink-0 sm:block">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</p>
          <p className="text-sm font-medium">{formatDate(today)}</p>
        </div>

        <div className="min-w-0 flex-1 md:max-w-md md:flex-none lg:ml-auto lg:max-w-sm xl:max-w-md">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/plan"
            title={todayPlan ? `${todayPlan.label} of ${schedule.length}` : undefined}
            className="hidden items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-medium text-primary sm:inline-flex"
          >
            <CalendarDays className="size-3.5" /> {dayBadge}
          </Link>
          <span
            className="hidden items-center gap-1.5 rounded-xl border border-warning/35 bg-warning/10 px-3 py-2 text-xs font-medium text-warning md:inline-flex"
            title="Current study streak"
          >
            <Flame className="size-3.5" /> {streaks.current}d
          </span>
          <SyncIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
