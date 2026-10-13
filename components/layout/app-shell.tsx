"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useLocalFlag } from "@/hooks/use-local-flag";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";
import { ClaimLocalDialog } from "./claim-local-dialog";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready } = useTracker();
  const [collapsed, setCollapsed] = useLocalFlag("a2z-sidebar-collapsed");
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  // LocalStorage is only read after hydration. The page is always rendered (so Next can
  // validate/prefetch the route) but stays invisible behind a loader until progress is in.
  return (
    <>
      {!ready && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <span className="size-9 animate-spin rounded-full border-2 border-muted border-t-primary" />
            Loading your progress…
          </div>
        </div>
      )}
      <div
        className={cn("min-h-screen transition-[padding] duration-300", collapsed ? "md:pl-[4.5rem]" : "md:pl-[4.5rem] lg:pl-64", !ready && "invisible")}
        aria-busy={!ready}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <MobileDrawer open={drawer} onClose={closeDrawer} />
        <ClaimLocalDialog />
        <Header onOpenMenu={() => setDrawer(true)} />
        <main className="mx-auto max-w-7xl px-3 pb-16 pt-6 sm:px-6">{children}</main>
      </div>
    </>
  );
}
