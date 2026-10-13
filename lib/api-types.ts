import type { Progress, RevisionStatus } from "./types";

/** Shared by the API handlers and the browser client (no server imports here). */

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; fields?: Record<string, string>; current?: ProgressRowDTO };
}

/** One problem's saved state. */
export interface ProgressRowDTO {
  problemId: string;
  completed: boolean;
  completedDate: string | null; // user's local YYYY-MM-DD
  completedAt: number | null; // epoch ms
  note: string | null;
  revision: RevisionStatus | null;
  updatedAt: string; // ISO instant, used for conflict detection
}

/** GET /api/v1/progress: the existing `Progress` shape plus per-row server timestamps. */
export interface SnapshotDTO extends Progress {
  rowUpdatedAt: Record<string, string>;
}

export interface PutProgressBody {
  completed?: boolean;
  localDate?: string;
  note?: string | null;
  revision?: RevisionStatus | null;
  clientUpdatedAt?: string;
}

export interface ImportResultDTO {
  imported: number;
  skipped: number;
}
