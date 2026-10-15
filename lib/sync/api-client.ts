import type {
  ApiErrorBody,
  ApiErrorCode,
  ImportResultDTO,
  ProgressRowDTO,
  PutProgressBody,
  SnapshotDTO,
} from "@/lib/api-types";
import type { Filters, UiPreferences } from "@/lib/types";

/** Typed fetch wrappers for /api/v1. Same-origin; cookies carry the session. */

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode | "NETWORK",
    readonly status: number,
    message: string,
    readonly current?: ProgressRowDTO,
  ) {
    super(message);
  }
  /** Worth retrying: the request may never have reached the server, or the server hiccuped. */
  get retryable() {
    return this.code === "NETWORK" || this.status >= 500;
  }
}

async function call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      signal: AbortSignal.timeout(15_000),
      ...rest,
      cache: "no-store",
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiClientError("NETWORK", 0, "Network error");
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error (e.g. platform 502 page) */
    }
    throw new ApiClientError(body?.error.code ?? "INTERNAL", res.status, body?.error.message ?? `Request failed (${res.status})`, body?.error.current);
  }
  return (await res.json()) as T;
}

let preferenceSessionId: string | undefined;
let preferenceSequence = 0;

function preferenceMutation() {
  preferenceSessionId ??= crypto.randomUUID();
  return { sessionId: preferenceSessionId, sequence: ++preferenceSequence };
}

export const api = {
  lock: () => call<void>("/auth/lock", { method: "POST" }),
  getSnapshot: () => call<SnapshotDTO>("/progress"),
  putProgress: (problemId: string, body: PutProgressBody) => call<ProgressRowDTO>(`/progress/${encodeURIComponent(problemId)}`, { method: "PUT", json: body }),
  putPlan: (startDate: string) => call<{ startDate: string }>("/plan", { method: "PUT", json: { startDate } }),
  patchPreferences: (patch: { ui?: Partial<UiPreferences>; filters?: Partial<Filters>; celebratedMilestones?: number[] }) => call<unknown>("/preferences", { method: "PATCH", json: { ...patch, mutation: preferenceMutation() }, keepalive: true }),
  importData: (mode: "replace" | "merge", data: unknown) => call<ImportResultDTO>("/import", { method: "POST", json: { mode, data } }),
  migrateLocal: (data: unknown) => call<ImportResultDTO>("/migrate/local", { method: "POST", json: { data } }),
  resetAll: () => call<void>("/progress", { method: "DELETE", json: { confirm: "RESET" } }),
  exportText: async (): Promise<string> => {
    let res: Response;
    try {
      res = await fetch("/api/v1/export", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new ApiClientError("NETWORK", 0, "Network error");
    }
    if (!res.ok) throw new ApiClientError("INTERNAL", res.status, `Export failed (${res.status})`);
    return res.text();
  },
};
