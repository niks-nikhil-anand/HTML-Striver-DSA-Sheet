"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Flame, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { STREAK_QUOTES, dailyQuote } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-xl px-1.5 py-1" aria-label="DSA Tracker, home">
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/30 bg-[#030916] shadow-[0_6px_18px_-5px_rgba(37,99,235,0.7)] ring-1 ring-white/10 dark:shadow-[0_0_20px_-5px_rgba(99,102,241,0.75)]">
        <Image src="/logo/Neon%20Summit%20DSA%20Tracker.png" alt="" width={40} height={40} className="size-full object-cover" priority />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-heading text-sm font-semibold tracking-wide">DSA Tracker</span>
          <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Neon Summit</span>
        </span>
      )}
    </Link>
  );
}

export function NavList({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="grid gap-1">
      {NAV_ITEMS.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={compact ? n.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              compact && "justify-center px-0",
              active
                ? "bg-primary/12 font-medium text-foreground ring-1 ring-primary/35 dark:shadow-[0_0_20px_-8px_var(--primary)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {active && <span aria-hidden className="accent-fill absolute left-0 top-2 bottom-2 w-0.5 rounded-full" />}
            <n.icon className={cn("size-[1.15rem] shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-primary")} />
            <span className={cn(compact && "sr-only")}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MotivationCard() {
  const { today, streaks, overall } = useTracker();
  const quote = dailyQuote(STREAK_QUOTES, today);
  return (
    <div className="glass rounded-2xl p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-warning">
        <Flame className="size-3.5" /> {streaks.current > 0 ? `${streaks.current}-day streak` : "Start a streak today"}
      </div>
      <p className="text-xs leading-relaxed text-foreground/90">&ldquo;{quote}&rdquo;</p>
      <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">{overall.done}/{overall.total} solved</p>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  // Below lg the rail is always compact (tablet); on lg+ it expands unless collapsed.
  const labelsOnLg = !collapsed;
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar p-3 backdrop-blur-xl transition-[width] duration-300 md:flex",
        labelsOnLg ? "w-[4.5rem] lg:w-64" : "w-[4.5rem]",
      )}
    >
      <div className={cn("mb-6 mt-1", labelsOnLg ? "" : "")}>
        <div className="hidden lg:block">
          <Brand compact={collapsed} />
        </div>
        <div className="lg:hidden">
          <Brand compact />
        </div>
      </div>

      {/* Same list twice, so labels can switch purely with breakpoints (no layout JS). */}
      <div className="hidden lg:block">
        <NavList compact={collapsed} />
      </div>
      <div className="lg:hidden">
        <NavList compact />
      </div>

      <div className="mt-auto grid gap-3">
        {labelsOnLg && (
          <div className="hidden lg:block">
            <MotivationCard />
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="hidden items-center justify-center gap-2 rounded-xl py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
