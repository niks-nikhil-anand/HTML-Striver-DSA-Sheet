"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, loadError, retryLoad, progress, setUi, busy } = useTracker();
  const collapsed = progress.prefs.ui?.sidebarCollapsed ?? false;
  const setCollapsed = (value: boolean) => setUi({ sidebarCollapsed: value });
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  return (
    <>
      {!ready && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            {!loadError && <span className="size-9 animate-spin rounded-full border-2 border-muted border-t-primary" />}
            {loadError ?? "Loading your progress…"}
            {loadError && <button onClick={retryLoad} className="underline">Retry loading</button>}
          </div>
        </div>
      )}
      <div
        className={cn("min-h-screen transition-[padding] duration-300", collapsed ? "md:pl-[4.5rem]" : "md:pl-[4.5rem] lg:pl-64", !ready && "invisible")}
        aria-busy={!ready}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <MobileDrawer open={drawer} onClose={closeDrawer} />
        <Header onOpenMenu={() => setDrawer(true)} />
        <main className="mx-auto max-w-7xl px-3 pb-16 pt-6 sm:px-6"><fieldset disabled={busy} className="min-w-0">{children}</fieldset></main>
      </div>
    </>
  );
}
