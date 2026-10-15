"use client";

import { LockButton } from "@/components/auth/lock-button";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand, MotivationCard, NavList } from "./sidebar";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-50 md:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        inert={!open}
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-5 border-r border-sidebar-border bg-popover p-4 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <div className="mt-auto grid gap-3">
          <LockButton />
          <MotivationCard />
        </div>
      </aside>
    </div>
  );
}
