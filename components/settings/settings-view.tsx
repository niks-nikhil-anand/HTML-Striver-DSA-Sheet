"use client";

import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/common/panel";
import { SectionTitle } from "@/components/common/section-title";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTracker } from "@/hooks/use-tracker";
import { PROBLEMS, PROBLEM_IDS } from "@/lib/problems";
import { parseImport } from "@/lib/progress";
import type { Progress } from "@/lib/types";

export function SettingsView() {
  const { progress, resetProgress, replaceProgress, exportData, sync, retrySave } = useTracker();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, setPending] = useState<Progress | null>(null);

  async function doExport() {
    try {
    const blob = new Blob([await exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsa-tracker-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Progress exported");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); }
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
      <div role="status" className="text-sm text-muted-foreground">
        {sync.state === "saving" ? "Saving changes…" : sync.state === "offline" || sync.state === "error" ? "Some changes are unsaved. Keep this tab open and retry when connected." : "Your progress and preferences are saved in your account."}
        {(sync.state === "offline" || sync.state === "error") && <Button variant="outline" onClick={retrySave}>Retry saving</Button>}
      </div>

      <Panel>
        <SectionTitle title="Backup" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={doExport}><Download /> Export progress</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Import progress</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">JSON includes completions, notes, revision status and preferences. Imports are validated before anything changes.</p>
      </Panel>

      <Panel>
        <SectionTitle title="About the data" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Problems, topics and order come from takeuforward&apos;s official Striver A2Z DSA Sheet ({PROBLEMS.length} practice problems; theory/video lessons and contests are not included).
          The sheet itself doesn&apos;t publish Easy/Medium/Hard, so difficulty is mapped from its tiers: basic → Easy, core → Medium, pro → Hard.
          Links go to LeetCode where the sheet provides one, otherwise to takeuforward. C++ and Java solution links come from community repos and exist only for matched problems.
        </p>
      </Panel>

      <Panel className="border-destructive/30">
        <SectionTitle title="Danger zone" />
        <Button variant="destructive" onClick={() => setResetOpen(true)}><Trash2 /> Reset progress</Button>
        <p className="mt-2 text-xs text-muted-foreground">Clears all completions, notes, revision marks and preferences from your account.</p>
      </Panel>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all progress?</DialogTitle>
            <DialogDescription>
              This permanently removes {Object.keys(progress.completed).length} completed problems, {Object.keys(progress.notes).length} notes and all revision marks. Export first if you may want them back. Earned achievements are kept.
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
              The file contains {pending ? Object.keys(pending.completed).length : 0} completed problems, {pending ? Object.keys(pending.notes).length : 0} notes. It will replace what is stored here.
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
