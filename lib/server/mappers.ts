import type { ProgressRowDTO } from "@/lib/api-types";
import type { RevisionStatus } from "@/lib/types";

// Prisma enum (NEEDS_REVISION) <-> app value ("needs-revision")
export const toDbRevision = (r: RevisionStatus | null | undefined) =>
  r === "needs-revision" ? ("NEEDS_REVISION" as const) : r === "mastered" ? ("MASTERED" as const) : null;

export const fromDbRevision = (r: "NEEDS_REVISION" | "MASTERED" | null | undefined): RevisionStatus | null =>
  r === "NEEDS_REVISION" ? "needs-revision" : r === "MASTERED" ? "mastered" : null;

// @db.Date columns are UTC-midnight Dates; the app uses "YYYY-MM-DD" strings.
export const toDateOnly = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const fromDateOnly = (d: Date) => d.toISOString().slice(0, 10);

interface ProgressRow {
  problemId: string;
  completedAt: Date | null;
  completedDate: Date | null;
  revision: "NEEDS_REVISION" | "MASTERED" | null;
  note: string | null;
  updatedAt: Date;
}

export function toRowDTO(row: ProgressRow): ProgressRowDTO {
  return {
    problemId: row.problemId,
    completed: row.completedAt !== null,
    completedDate: row.completedDate ? fromDateOnly(row.completedDate) : null,
    completedAt: row.completedAt ? row.completedAt.getTime() : null,
    note: row.note,
    revision: fromDbRevision(row.revision),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** The DTO for a problem with no saved state (all defaults). */
export function emptyRowDTO(problemId: string, now: Date): ProgressRowDTO {
  return { problemId, completed: false, completedDate: null, completedAt: null, note: null, revision: null, updatedAt: now.toISOString() };
}
