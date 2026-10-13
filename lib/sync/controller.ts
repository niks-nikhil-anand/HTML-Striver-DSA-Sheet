import type { ProgressRowDTO, SnapshotDTO } from "@/lib/api-types";
import { PROBLEM_IDS } from "@/lib/problems";
import { validateProgress } from "@/lib/storage";
import type { Progress } from "@/lib/types";
import { api, ApiClientError } from "./api-client";
import { applyOp, diffProgress, type SyncOp } from "./diff";
import { SyncQueue, type SyncStatus } from "./queue";

/**
 * guest   : not signed in (or sync disabled). The app works exactly as before, on LocalStorage.
 * unknown : sync enabled but the first server contact has not succeeded yet.
 * synced  : signed in; every change is queued to the server.
 */
export type SyncMode = "guest" | "unknown" | "synced";

export interface ControllerEvents {
  getProgress: () => Progress;
  /** Replace UI state WITHOUT triggering another sync. */
  apply: (p: Progress) => void;
  onMode: (m: SyncMode) => void;
  onStatus: (s: SyncStatus) => void;
  /** Local data exists, the account is empty and the user has not decided yet. */
  onClaimOffer: (local: Progress) => void;
  notify: (kind: "error" | "info", message: string) => void;
}

const PENDING_KEY = "dsa-tracker:pending";
const HANDLED_KEY = "dsa-tracker:claim-handled";
const BACKUP_KEY = "dsa-tracker:local-backup";

const hasData = (p: Progress) => Object.keys(p.completed).length + Object.keys(p.notes).length + Object.keys(p.revision).length > 0;

function fromSnapshot(s: SnapshotDTO): Progress {
  // Normalise through the same validator the browser uses for imports.
  const valid = validateProgress(s, PROBLEM_IDS);
  if (!valid) throw new ApiClientError("INTERNAL", 500, "Server returned an unreadable snapshot");
  return valid;
}

export class SyncController {
  mode: SyncMode = "guest";
  private stamps = new Map<string, string>();
  private queue: SyncQueue;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private cleanup: Array<() => void> = [];

  constructor(
    private ev: ControllerEvents,
    private storage: Storage | null,
  ) {
    this.queue = new SyncQueue({
      send: (op) => this.send(op),
      onStatus: ev.onStatus,
      onRejected: (_op, err) => {
        if (err.status === 401) return this.goGuest("You are signed out. Changes are now saved on this device only.");
        this.ev.notify("error", err.message);
        void this.refresh(); // resync so the UI reverts the rejected change
      },
      onConflict: (op, err) => this.adoptConflict(op, err),
      storage,
      storageKey: PENDING_KEY,
    });
  }

  /** Begin: contact the server and, if signed in, switch to synced mode. */
  async start(): Promise<void> {
    this.setMode("unknown");
    this.queue.restore();

    const onVisibility = () => document.visibilityState === "hidden" && this.queue.flushNow();
    const onOnline = () => {
      this.queue.flushNow();
      if (this.mode === "unknown") void this.connect();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    window.addEventListener("online", onOnline);
    this.cleanup.push(
      () => document.removeEventListener("visibilitychange", onVisibility),
      () => window.removeEventListener("pagehide", onVisibility),
      () => window.removeEventListener("online", onOnline),
    );
    await this.connect();
  }

  destroy() {
    this.destroyed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.queue.destroy();
    this.cleanup.forEach((fn) => fn());
  }

  /** Called by the provider after every local change. */
  track(prev: Progress, next: Progress) {
    if (this.mode === "guest") return;
    for (const op of diffProgress(prev, next)) this.queue.enqueue(op);
  }

  async importReplace(p: Progress): Promise<void> {
    if (this.mode !== "synced") return;
    await api.importData("replace", p);
    this.queue.clear();
    await this.refresh();
  }

  async reset(): Promise<void> {
    if (this.mode !== "synced") return;
    await api.resetAll();
    this.queue.clear();
    await this.refresh();
  }

  async exportText(): Promise<string | null> {
    if (this.mode !== "synced") return null;
    try {
      return await api.exportText();
    } catch {
      return null; // caller falls back to a local export
    }
  }

  /** The user chose to move this device's progress into the account. */
  async claimLocal(local: Progress): Promise<void> {
    await api.migrateLocal(local);
    this.markHandled();
    await this.refresh();
  }

  dismissClaim() {
    this.markHandled();
  }

  // -- internals ------------------------------------------------------------

  private setMode(m: SyncMode) {
    this.mode = m;
    this.ev.onMode(m);
  }

  private goGuest(message?: string) {
    this.queue.clear();
    this.setMode("guest");
    if (message) this.ev.notify("info", message);
  }

  private markHandled() {
    try {
      this.storage?.setItem(HANDLED_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  private isHandled() {
    try {
      return this.storage?.getItem(HANDLED_KEY) === "1";
    } catch {
      return false;
    }
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return;
    try {
      const snapshot = await api.getSnapshot();
      const local = this.ev.getProgress();
      const server = fromSnapshot(snapshot);
      const serverEmpty = !hasData(server);

      if (serverEmpty && hasData(local) && !this.isHandled()) {
        try {
          this.storage?.setItem(BACKUP_KEY, JSON.stringify(local));
        } catch {
          /* ignore */
        }
        this.ev.onClaimOffer(local);
      }
      this.adopt(snapshot);
      this.setMode("synced");
      this.queue.flushNow();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) return this.goGuest();
      // Offline / server down: keep working locally, keep the queue, try again later.
      if (!this.destroyed) this.retryTimer = setTimeout(() => void this.connect(), 10_000);
    }
  }

  /** Re-read the server state (used after import/reset/rejections). */
  async refresh(): Promise<void> {
    try {
      this.adopt(await api.getSnapshot());
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) this.goGuest();
    }
  }

  /** Server is authoritative; replay any unsent local edits on top so they are not lost. */
  private adopt(snapshot: SnapshotDTO) {
    this.stamps = new Map(Object.entries(snapshot.rowUpdatedAt));
    const replayed = this.queue.pendingOps().reduce((acc, op) => applyOp(acc, op), fromSnapshot(snapshot));
    this.ev.apply(replayed);
  }

  private async send(op: SyncOp): Promise<unknown> {
    if (this.mode === "unknown") throw new ApiClientError("NETWORK", 0, "Waiting for the server");
    if (op.kind === "plan") return api.putPlan(op.startDate);
    if (op.kind === "prefs") return api.patchPreferences({ filters: op.filters, celebratedMilestones: op.celebratedMilestones });
    const row = await api.putProgress(op.problemId, { ...op.body, clientUpdatedAt: this.stamps.get(op.problemId) });
    this.stamps.set(op.problemId, row.updatedAt);
    return row;
  }

  private adoptConflict(op: SyncOp, err: ApiClientError) {
    const current: ProgressRowDTO | undefined = err.current;
    if (op.kind !== "row" || !current) return void this.refresh();
    this.stamps.set(op.problemId, current.updatedAt);
    const p = this.ev.getProgress();
    const completed = { ...p.completed };
    const notes = { ...p.notes };
    const revision = { ...p.revision };
    if (current.completed && current.completedDate) completed[op.problemId] = { date: current.completedDate, at: current.completedAt ?? Date.now() };
    else delete completed[op.problemId];
    if (current.note) notes[op.problemId] = current.note;
    else delete notes[op.problemId];
    if (current.revision) revision[op.problemId] = current.revision;
    else delete revision[op.problemId];
    this.ev.apply({ ...p, completed, notes, revision });
    this.ev.notify("info", "Updated from another device");
  }
}
