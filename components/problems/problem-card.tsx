"use client";

import { memo, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileCode2,Link2Off, NotebookPen, RotateCcw, Trophy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { PROBLEM_NUMBER, isSafeUrl } from "@/lib/problems";
import type { Problem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "@/components/common/difficulty-badge";

function NoteEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (text === initial) return;
    const t = window.setTimeout(() => onSave(text), 500);
    return () => window.clearTimeout(t);
  }, [text, initial, onSave]);
  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== initial && onSave(text)}
      maxLength={5000}
      rows={3}
      placeholder="Approach, edge cases, what tripped you up…"
      aria-label="Personal notes"
      className="mt-2 text-sm"
    />
  );
}

function ProblemCardImpl({ problem, prominent = false }: { problem: Problem; prominent?: boolean }) {
  const { progress, today, dayOf, toggleComplete, setNote, setRevision } = useTracker();
  const done = progress.completed[problem.id];
  const rev = progress.revision[problem.id];
  const note = progress.notes[problem.id] ?? "";
  const day = dayOf.get(problem.id);
  const overdue = !done && !!day && day.date < today;
  const [open, setOpen] = useState(false);
  const practiceLinks = [
    { label: "LeetCode", url: problem.leetcodeUrl },
    { label: "GFG", url: problem.gfgUrl },
    { label: "takeuforward", url: problem.tufUrl },
  ].filter((l): l is { label: string; url: string } => isSafeUrl(l.url));

  return (
    <article
      className={cn(
        "rise lift group rounded-xl border bg-card/60 p-3.5 backdrop-blur-sm transition-colors sm:p-4",
        done ? "border-success/30 bg-success/[0.04]" : overdue ? "border-destructive/40 bg-destructive/[0.04]" : "border-border hover:border-primary/40",
        prominent && "p-4 sm:p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={!!done}
          onCheckedChange={() => toggleComplete(problem.id)}
          aria-label={`Mark "${problem.title}" ${done ? "incomplete" : "complete"}`}
          className={cn("mt-0.5 shrink-0", prominent ? "size-7 rounded-md [&_svg]:size-5" : "size-6 rounded-md sm:size-5 [&_svg]:size-4 sm:[&_svg]:size-3.5")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className={cn("min-w-0 font-medium leading-snug", prominent ? "text-base" : "text-sm", done && "text-muted-foreground line-through decoration-muted-foreground/50")}>
              <span className="mr-1.5 font-mono text-xs font-normal text-muted-foreground">#{PROBLEM_NUMBER.get(problem.id) ?? "–"}</span>
              {problem.title || "Untitled problem"}
            </h3>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {problem.topic} <span aria-hidden>›</span> {problem.subtopic}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {day && (
              <span className="text-muted-foreground">
                {day.label} · {formatDate(day.date, { day: "numeric", month: "short" })}
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="size-3" /> Overdue
              </span>
            )}
            {done && (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3" /> Solved {formatDate(done.date, { day: "numeric", month: "short" })}
              </span>
            )}
            {practiceLinks.length > 0 ? (
              practiceLinks.map((l, i) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Solve "${problem.title}" on ${l.label}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset transition-colors",
                    i === 0 ? "bg-primary/10 text-primary ring-primary/35 hover:bg-primary/20" : "text-muted-foreground ring-border hover:text-foreground",
                  )}
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground" title="This problem has no valid link">
                <Link2Off className="size-3" /> Link unavailable
              </span>
            )}
            {isSafeUrl(problem.solutionUrl) && (
              <a href={problem.solutionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                <FileCode2 className="size-3" /> C++
              </a>
            )}
            {isSafeUrl(problem.javaSolutionUrl) && (
              <a href={problem.javaSolutionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                <FileCode2 className="size-3" /> Java
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={cn("inline-flex items-center gap-1 hover:text-foreground", note ? "text-primary" : "text-muted-foreground")}
            >
              <NotebookPen className="size-3" /> {note ? "Notes" : "Add note"}
            </button>
            <div className="ml-auto flex items-center gap-1" role="group" aria-label="Revision status">
              <button
                type="button"
                aria-pressed={rev === "needs-revision"}
                onClick={() => setRevision(problem.id, rev === "needs-revision" ? null : "needs-revision")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-inset transition-colors",
                  rev === "needs-revision" ? "bg-warning/15 text-warning ring-warning/40 dark:text-warning" : "text-muted-foreground ring-border hover:text-foreground",
                )}
              >
                <RotateCcw className="size-3" /> Revise
              </button>
              <button
                type="button"
                aria-pressed={rev === "mastered"}
                onClick={() => setRevision(problem.id, rev === "mastered" ? null : "mastered")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-inset transition-colors",
                  rev === "mastered" ? "bg-success/15 text-success ring-success/40 dark:text-success" : "text-muted-foreground ring-border hover:text-foreground",
                )}
              >
                <Trophy className="size-3" /> Mastered
              </button>
            </div>
          </div>
          {open && <NoteEditor key={problem.id} initial={note} onSave={(v) => setNote(problem.id, v)} />}
        </div>
      </div>
    </article>
  );
}

export const ProblemCard = memo(ProblemCardImpl);
