import { ApiClientError } from "./api-client";
import { mergeOps, opKey, type SyncOp } from "./diff";

export type SyncState = "idle" | "saving" | "offline" | "error";
export interface SyncStatus {
  state: SyncState;
  pending: number;
}

export interface QueueOptions {
  /** Sends one op. Throw ApiClientError to signal failure. */
  send: (op: SyncOp) => Promise<unknown>;
  onStatus?: (s: SyncStatus) => void;
  /** A non-retryable 4xx: the op was dropped; revert/notify. */
  onRejected?: (op: SyncOp, err: ApiClientError) => void;
  /** 409: the server copy is newer; the op was dropped. */
  onConflict?: (op: SyncOp, err: ApiClientError) => void;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  storageKey?: string;
  debounceMs?: { note: number; prefs: number };
  retryDelaysMs?: number[];
}

const DEFAULT_RETRY = [1_000, 2_000, 5_000, 15_000, 30_000];

/**
 * Write queue for server sync.
 * - Coalesces ops per key (one pending write per problem / plan / prefs).
 * - Debounces notes and preferences; ticks go out immediately.
 * - Sends one op at a time so per-problem ordering is preserved.
 * - Retries network/5xx failures with backoff; drops (and reports) other 4xx and 409.
 * - Persists unsent ops so a closed tab does not lose them.
 */
export class SyncQueue {
  private map = new Map<string, { op: SyncOp; readyAt: number }>();
  private inflight: SyncOp | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private blockedUntil = 0;
  private state: SyncState = "idle";
  private readonly o: Required<Pick<QueueOptions, "debounceMs" | "retryDelaysMs">> & QueueOptions;

  constructor(opts: QueueOptions) {
    this.o = { debounceMs: { note: 500, prefs: 1_000 }, retryDelaysMs: DEFAULT_RETRY, ...opts };
  }

  /** Load ops persisted by a previous session. Returns them (so callers can replay them onto a snapshot). */
  restore(): SyncOp[] {
    const { storage, storageKey } = this.o;
    if (!storage || !storageKey) return [];
    try {
      const raw = storage.getItem(storageKey);
      const ops = raw ? (JSON.parse(raw) as SyncOp[]) : [];
      if (!Array.isArray(ops)) return [];
      for (const op of ops) this.put(op, 0);
      this.persist();
      this.emit();
      this.schedule();
      return ops;
    } catch {
      return [];
    }
  }

  pendingOps(): SyncOp[] {
    return [...(this.inflight ? [this.inflight] : []), ...[...this.map.values()].map((e) => e.op)];
  }

  enqueue(op: SyncOp): void {
    const delay = op.kind === "prefs" ? this.o.debounceMs.prefs : op.kind === "row" && op.body.note !== undefined && op.body.completed === undefined ? this.o.debounceMs.note : 0;
    this.put(op, delay);
    this.persist();
    this.emit();
    this.schedule();
  }

  /** Skip debounce and backoff (tab hiding, coming back online). */
  flushNow(): void {
    this.attempts = 0;
    this.blockedUntil = 0;
    for (const e of this.map.values()) e.readyAt = 0;
    this.schedule();
  }

  /** Drop everything (sign-out, reset, replace). */
  clear(): void {
    this.map.clear();
    this.inflight = null;
    this.attempts = 0;
    this.blockedUntil = 0;
    this.persist();
    this.state = "idle";
    this.emit();
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // -- internals ------------------------------------------------------------

  private put(op: SyncOp, delay: number) {
    const key = opKey(op);
    const existing = this.map.get(key);
    this.map.set(key, { op: existing ? mergeOps(existing.op, op) : op, readyAt: Date.now() + delay });
  }

  private status(): SyncStatus {
    return { state: this.state, pending: this.map.size + (this.inflight ? 1 : 0) };
  }

  private emit() {
    this.o.onStatus?.(this.status());
  }

  private persist() {
    const { storage, storageKey } = this.o;
    if (!storage || !storageKey) return;
    try {
      const ops = this.pendingOps();
      if (ops.length === 0) storage.removeItem(storageKey);
      else storage.setItem(storageKey, JSON.stringify(ops));
    } catch {
      /* storage full/unavailable: the queue still works in memory */
    }
  }

  private schedule() {
    if (this.running || this.map.size === 0) return;
    if (this.timer) clearTimeout(this.timer);
    const soonest = Math.min(...[...this.map.values()].map((e) => e.readyAt));
    const wait = Math.max(0, Math.max(soonest, this.blockedUntil) - Date.now());
    this.timer = setTimeout(() => void this.pump(), wait);
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    this.timer = null;
    try {
      while (true) {
        const now = Date.now();
        if (now < this.blockedUntil) break;
        const next = [...this.map.entries()].filter(([, e]) => e.readyAt <= now).sort((a, b) => a[1].readyAt - b[1].readyAt)[0];
        if (!next) break;
        const [key, entry] = next;
        this.map.delete(key);
        this.inflight = entry.op;
        this.state = "saving";
        this.emit();
        try {
          await this.o.send(entry.op);
          this.inflight = null;
          this.attempts = 0;
          this.state = this.map.size > 0 ? "saving" : "idle";
        } catch (e) {
          const err = e instanceof ApiClientError ? e : new ApiClientError("NETWORK", 0, "Network error");
          this.inflight = null;
          if (err.retryable) {
            // Put it back (older op first) and back off.
            const newer = this.map.get(key);
            this.map.set(key, { op: newer ? mergeOps(entry.op, newer.op) : entry.op, readyAt: 0 });
            const delays = this.o.retryDelaysMs;
            this.blockedUntil = Date.now() + delays[Math.min(this.attempts, delays.length - 1)];
            this.attempts++;
            this.state = "offline";
            break;
          }
          if (err.code === "CONFLICT") this.o.onConflict?.(entry.op, err);
          else this.o.onRejected?.(entry.op, err);
          this.state = "error";
        }
        this.persist();
        this.emit();
      }
    } finally {
      this.running = false;
      this.persist();
      if (this.map.size === 0 && this.state !== "error" && this.state !== "offline") this.state = "idle";
      this.emit();
      this.schedule();
    }
  }
}
