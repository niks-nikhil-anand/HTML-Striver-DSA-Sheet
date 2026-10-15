"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";

const subscribe = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export function ThemeToggle() {
  const { progress, setUi } = useTracker();
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const dark = progress.prefs.ui?.theme === "dark" || ((progress.prefs.ui?.theme ?? "system") === "system" && systemDark);
  const setTheme = (theme: "dark" | "light") => setUi({ theme });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative inline-flex h-10 w-[4.5rem] shrink-0 items-center rounded-full border border-border bg-card/70 p-1 backdrop-blur transition-colors hover:border-primary/50 focus-visible:outline-2"
    >
      <span
        aria-hidden
        className={cn(
          "accent-fill grid size-8 place-items-center rounded-full text-white shadow transition-transform duration-300 dark:shadow-[0_0_14px_-2px_var(--primary)]",
          dark ? "translate-x-8" : "translate-x-0",
        )}
      >
        {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </span>
      <Sun aria-hidden className={cn("absolute right-2.5 size-4 text-muted-foreground transition-opacity", dark ? "opacity-100" : "opacity-0")} />
      <Moon aria-hidden className={cn("absolute left-2.5 size-4 text-muted-foreground transition-opacity", dark ? "opacity-0" : "opacity-100")} />
    </button>
  );
}
