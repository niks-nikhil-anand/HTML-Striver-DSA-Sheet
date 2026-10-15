"use client";

import { useEffect, useEffectEvent } from "react";
import { usePathname } from "next/navigation";

interface Options {
  ready: boolean;
  viewKey: string;
  savedY: number;
  save: (y: number) => void;
  flush: () => void;
}

/** Persist settled scrolling; never let an outgoing view overwrite a newly reset view. */
export function useProblemScroll({ ready, viewKey, savedY, save, flush }: Options) {
  const pathname = usePathname();
  const latest = useEffectEvent(() => ({ viewKey, savedY, save, flush, pathname }));

  useEffect(() => {
    if (!ready || pathname !== "/problems") return;
    let alive = true;
    let restored = false;
    let lastY = latest().savedY;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const persist = () => {
      if (timer) clearTimeout(timer);
      const current = latest();
      if (!dirty || current.viewKey !== viewKey) return;
      current.save(lastY);
      dirty = false;
    };
    const capture = () => {
      if (!restored || latest().viewKey !== viewKey || latest().pathname !== "/problems") return;
      const y = Math.max(0, Math.round(window.scrollY));
      if (y === lastY) return;
      lastY = y;
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, 500);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") { capture(); persist(); latest().flush(); }
    };
    const pagehide = () => { capture(); persist(); latest().flush(); };

    // Wait for Next's navigation scroll and the API-backed list to settle first.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (!alive) return;
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        lastY = Math.min(Math.max(0, latest().savedY), max);
        window.scrollTo({ top: lastY, behavior: "instant" });
        restored = true;
      });
    });
    window.addEventListener("scroll", capture, { passive: true });
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", capture);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", hide);
      persist(); // Uses the captured position, never the new route's scroll position.
      if (timer) clearTimeout(timer);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [ready, pathname, viewKey]);
}
