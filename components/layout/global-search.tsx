"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ListChecks, Search } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { PROBLEMS, TOPICS } from "@/lib/problems";
import { cn } from "@/lib/utils";

type Option = { key: string; kind: "topic" | "problem"; label: string; hint?: string; run: () => void };

export function GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { setFilters, clearFilters } = useTracker();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const go = (patch: Parameters<typeof setFilters>[0]) => {
    clearFilters();
    setFilters(patch);
    setOpen(false);
    router.push("/problems");
  };

  const options = useMemo<Option[]>(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const topics = TOPICS.filter((t) => t.toLowerCase().includes(q)).slice(0, 4);
    const probs = PROBLEMS.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 6);
    return [
      ...topics.map<Option>((t) => ({ key: `t-${t}`, kind: "topic", label: t, hint: "Topic", run: () => go({ topic: t }) })),
      ...probs.map<Option>((p) => ({ key: p.id, kind: "problem", label: p.title, hint: p.topic, run: () => go({ query: p.title }) })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showList = open && text.trim().length > 0;

  return (
    <div ref={rootRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
        aria-label="Search problems and topics"
        placeholder="Search problems or topics…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") return setOpen(false);
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && text.trim()) {
            e.preventDefault();
            if (options[active]) options[active].run();
            else go({ query: text.trim() });
          }
        }}
        className="h-10 w-full rounded-xl border border-input bg-card/60 pl-9 pr-3 text-sm text-foreground backdrop-blur placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="glass absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-xl bg-popover p-1.5 shadow-xl"
          style={{ background: "var(--popover)" }}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No matches. Press Enter to search problems for &ldquo;{text.trim()}&rdquo;.
            </li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); o.run(); }}
                className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm", i === active ? "bg-accent text-foreground" : "text-foreground/85")}
              >
                {o.kind === "topic" ? <BookOpen className="size-4 shrink-0 text-secondary" /> : <ListChecks className="size-4 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
