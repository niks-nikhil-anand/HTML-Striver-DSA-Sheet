"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ExternalLink, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "@/components/common/difficulty-badge";
import { useTracker } from "@/hooks/use-tracker";
import { PROBLEMS, isSafeUrl } from "@/lib/problems";
import { searchHighlights, searchProblems } from "@/lib/problem-search";
import { cn } from "@/lib/utils";

function Highlight({ text, query }: { text: string; query: string }) {
  return searchHighlights(text, query).map((part, i) => part.match ? <mark key={i} className="rounded-sm bg-primary/15 text-inherit">{part.text}</mark> : part.text);
}

export function GlobalSearch() {
  const router = useRouter();
  const popupId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusOnOpen = useRef(false);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { setFilters, progress, toggleComplete, ready, busy, sync, retrySave } = useTracker();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => searchProblems(PROBLEMS, text), [text]);
  const results = matches.slice(0, 8);
  const showList = open && text.trim().length > 0;

  const go = (query: string) => {
    // Only explicit navigation changes the user's saved Problems-page filters.
    // Clear restrictive filters so every suggested result remains visible.
    setFilters({ query, topic: "All", difficulty: "All", status: "all" });
    setOpen(false);
    router.push("/problems");
  };
  const focusResult = (index: number) => {
    if (index < 0) { setActive(-1); inputRef.current?.focus(); return; }
    const target = Math.min(index, results.length - 1);
    setActive(target);
    resultRefs.current[target]?.focus();
  };

  useEffect(() => {
    if (showList && focusOnOpen.current) {
      focusOnOpen.current = false;
      resultRefs.current[0]?.focus();
    }
  }, [showList]);

  useEffect(() => {
    const onDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("relative ml-auto w-full transition-[width] duration-200 motion-reduce:transition-none lg:w-[78%] lg:hover:w-full lg:focus-within:w-full", open && "lg:w-full")}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); inputRef.current?.focus(); setOpen(false); } }}
    >
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? popupId : undefined}
        aria-haspopup="grid"
        aria-autocomplete="list"
        aria-label="Search problems and topics"
        autoComplete="off"
        placeholder="Search problems or topics…"
        value={text}
        onChange={(event) => { setText(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (showList && results.length) focusResult(0);
            else { focusOnOpen.current = results.length > 0; setOpen(true); }
          }
          if (event.key === "Enter" && text.trim()) { event.preventDefault(); go(text.trim()); }
        }}
        className="h-10 w-full rounded-xl border border-input bg-card/60 pl-9 pr-10 text-sm text-foreground backdrop-blur placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text && <button type="button" aria-label="Clear global search" onClick={() => { setText(""); setOpen(false); setActive(-1); inputRef.current?.focus(); }} className="absolute right-0 top-0 grid size-10 place-items-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X aria-hidden className="size-4" /></button>}
      {showList && (
        <div className="fixed left-3 right-3 top-[4.25rem] z-40 flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-full sm:min-w-[min(26rem,calc(100vw-1.5rem))]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p role="status" className="text-xs text-muted-foreground">{matches.length} matching {matches.length === 1 ? "problem" : "problems"}{matches.length > 8 ? " · Top 8" : ""}</p>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">↓ Navigate · Esc Close</span>
          </div>
          {results.length ? (
            <div id={popupId} role="grid" aria-label="Suggested problems" className="min-h-0 overflow-y-auto overscroll-contain p-1.5"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); focusResult(active + (event.key === "ArrowDown" ? 1 : -1)); }
              }}>
              {results.map((problem, index) => {
                const done = !!progress.completed[problem.id];
                return (
                  <div key={problem.id} role="row" className={cn("flex items-center gap-1 rounded-lg px-1.5 py-1", active === index ? "bg-accent" : "hover:bg-accent/60")}>
                    <div role="gridcell" className="grid size-10 shrink-0 place-items-center"><Checkbox checked={done} disabled={!ready || busy} onFocus={() => setActive(index)} onCheckedChange={() => toggleComplete(problem.id)} aria-label={`Mark "${problem.title}" ${done ? "incomplete" : "complete"} from search`} className="size-5" /></div>
                    <div role="gridcell" className="min-w-0 flex-1">
                      <button type="button" ref={(element) => { resultRefs.current[index] = element; }} onFocus={() => setActive(index)} onClick={() => go(problem.title)} className="grid min-h-14 w-full gap-1 rounded-md py-1.5 pr-1 text-left focus-visible:outline-2 focus-visible:outline-ring">
                        <span className={cn("text-sm font-medium leading-snug", done && "text-muted-foreground")}><Highlight text={problem.title} query={text} /></span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><span><Highlight text={problem.topic} query={text} /></span><DifficultyBadge difficulty={problem.difficulty} />{done && <span className="text-success">Completed</span>}</span>
                      </button>
                    </div>
                    <div role="gridcell" className="shrink-0">{isSafeUrl(problem.url) && <a href={problem.url} target="_blank" rel="noopener noreferrer" aria-label={`Practice "${problem.title}" in a new tab`} onFocus={() => setActive(index)} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><ExternalLink aria-hidden className="size-4" /></a>}</div>
                  </div>
                );
              })}
            </div>
          ) : <div id={popupId} role="grid" aria-label="Suggested problems" className="px-4 py-6"><div role="row"><p role="gridcell" className="text-sm text-muted-foreground">No matching problems. Try a title or topic such as “binary search”.</p></div></div>}
          <div className="shrink-0 border-t border-border">
            <div role="status" className="flex items-center justify-between gap-2 px-3 pt-2 text-[11px] text-muted-foreground">
              <span>{sync.state === "offline" ? "Offline · changes are not saved yet" : sync.state === "error" ? "Some changes couldn’t be saved" : sync.pending > 0 ? "Saving changes…" : "All changes saved"}</span>
              {(sync.state === "offline" || sync.state === "error") && <button type="button" onClick={retrySave} className="min-h-8 rounded px-2 font-medium text-primary underline focus-visible:outline-2 focus-visible:outline-ring">Retry saving</button>}
            </div>
            <button type="button" onClick={() => go(text.trim())} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><span>View all results for “{text.trim()}”</span><ArrowUpRight aria-hidden className="size-4 shrink-0" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
