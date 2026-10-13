"use client";

import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/common/panel";
import { SectionTitle } from "@/components/common/section-title";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { PROBLEMS, PROBLEM_IDS } from "@/lib/problems";
import { parseImport } from "@/lib/storage";
import type { Progress } from "@/lib/types";
import { StartDateEditor } from "./start-date-editor";

export function SettingsView() {
  const { progress, resetProgress, replaceProgress, exportData, setStartDate, storageOk, corrupted, schedule, sync } = useTracker();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, setPending] = useState<Progress | null>(null);

  async function doExport() {
    const blob = new Blob([await exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsa-tracker-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Progress exported");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) return void toast.error("That file is too large to be a progress export.");
    const parsed = parseImport(await file.text(), PROBLEM_IDS);
    if (!parsed) return void toast.error("Import failed", { description: "That file isn't a valid DSA Tracker export. Nothing was changed." });
    setPending(parsed);
  }

  return (
    <div className="grid max-w-3xl gap-5">
      {sync.enabled && (
        <div role="status" className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm">
          {sync.mode === "synced"
            ? "Signed in: your progress is saved to your account and kept in sync across devices."
            : sync.mode === "unknown"
              ? "Connecting to the server…"
              : "Guest mode: progress is saved on this device only. Sign in to sync it."}
        </div>
      )}
      {!storageOk && (
        <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          LocalStorage is unavailable or full, so progress won&apos;t survive a refresh. Export your progress regularly.
        </div>
      )}
      {corrupted && (
        <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Saved data couldn&apos;t be read and was ignored, so the tracker started fresh.
        </div>
      )}

      <Panel>
        <SectionTitle title="Study plan" />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <label htmlFor="start" className="text-xs font-medium text-muted-foreground">Day 01 date</label>
            <StartDateEditor key={progress.startDate} current={progress.startDate} onSave={(v) => { setStartDate(v); toast.success("Start date updated"); }} />
            <p className="mt-1.5 text-xs text-muted-foreground">Default is 13 Oct 2026. Completed problems stay completed; only the calendar shifts.</p>
          </div>
          <dl className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
            <dt>Total days</dt><dd className="text-foreground">{schedule.length}</dd>
            <dt>Problems/day</dt><dd className="text-foreground">2</dd>
            <dt>Final day</dt><dd className="text-foreground">{schedule.length ? formatDate(schedule[schedule.length - 1].date) : "–"}</dd>
          </dl>
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Backup" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={doExport}><Download /> Export progress</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Import progress</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">JSON includes completions, notes, revision status, start date and preferences. Imports are validated before anything changes.</p>
      </Panel>

      <Panel>
        <SectionTitle title="About the data" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Problems, topics and order come from takeuforward&apos;s official Striver A2Z DSA Sheet ({PROBLEMS.length} practice problems; theory/video lessons and contests are not scheduled).
          The sheet itself doesn&apos;t publish Easy/Medium/Hard, so difficulty is mapped from its tiers: basic → Easy, core → Medium, pro → Hard.
          Links go to LeetCode where the sheet provides one, otherwise to takeuforward. C++ and Java solution links come from community repos and exist only for matched problems.
        </p>
      </Panel>

      <Panel className="border-destructive/30">
        <SectionTitle title="Danger zone" />
        <Button variant="destructive" onClick={() => setResetOpen(true)}><Trash2 /> Reset progress</Button>
        <p className="mt-2 text-xs text-muted-foreground">Clears all completions, notes, revision marks and preferences from this browser.</p>
      </Panel>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all progress?</DialogTitle>
            <DialogDescription>
              This permanently removes {Object.keys(progress.completed).length} completed problems, {Object.keys(progress.notes).length} notes and all revision marks. Export first if you may want them back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { try { await resetProgress(); setResetOpen(false); toast.success("Progress reset"); } catch (e) { toast.error(e instanceof Error ? e.message : "Reset failed"); } }}>Yes, reset everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current progress?</DialogTitle>
            <DialogDescription>
              The file contains {pending ? Object.keys(pending.completed).length : 0} completed problems, {pending ? Object.keys(pending.notes).length : 0} notes, start date {pending?.startDate}. It will replace what is stored here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button onClick={async () => { if (!pending) return; try { await replaceProgress(pending); setPending(null); toast.success("Progress imported"); } catch (e) { toast.error("Import failed", { description: e instanceof Error ? e.message : undefined }); } }}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
