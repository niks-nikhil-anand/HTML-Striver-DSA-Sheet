import "server-only";
import type { ProgressRowDTO, PutProgressBody } from "@/lib/api-types";
import { diffDays } from "@/lib/dates";
import { db } from "../db";
import { ApiError } from "../errors";
import { emptyRowDTO, toDateOnly, toDbRevision, toRowDTO } from "../mappers";

/**
 * Idempotent upsert of whichever fields are present.
 * - completed:true on an already-completed problem is a no-op, so a retried request can never shift a streak date.
 * - If every field ends up at its default, the row is deleted.
 */
export async function putProgress(userId: string, problemId: string, body: PutProgressBody, now = new Date()): Promise<ProgressRowDTO> {
  const problem = await db.problem.findUnique({ where: { id: problemId }, select: { id: true } });
  if (!problem) throw new ApiError("NOT_FOUND", "Unknown problem");

  if (body.completed === true && body.localDate) {
    // The client knows the user's local day; the server only bounds it (max timezone spread is under 26h).
    if (Math.abs(diffDays(body.localDate, now.toISOString().slice(0, 10))) > 1) {
      throw new ApiError("VALIDATION", "localDate is too far from the current date", { fields: { localDate: "Must be today in your timezone" } });
    }
  }

  return db.$transaction(
    async (tx) => {
      const existing = await tx.problemProgress.findUnique({ where: { userId_problemId: { userId, problemId } } });

      if (body.clientUpdatedAt && existing && existing.updatedAt.getTime() > new Date(body.clientUpdatedAt).getTime()) {
        throw new ApiError("CONFLICT", "This problem was changed elsewhere", { current: toRowDTO(existing) });
      }

      let completedAt = existing?.completedAt ?? null;
      let completedDate = existing?.completedDate ?? null;
      if (body.completed === true && !completedAt) {
        completedAt = now;
        completedDate = toDateOnly(body.localDate!);
        await tx.completionEvent.create({ data: { userId, problemId, kind: "COMPLETE", localDate: completedDate } });
      } else if (body.completed === false && completedAt) {
        await tx.completionEvent.create({
          data: { userId, problemId, kind: "UNCOMPLETE", localDate: completedDate ?? toDateOnly(now.toISOString().slice(0, 10)) },
        });
        completedAt = null;
        completedDate = null;
      }

      const note = body.note === undefined ? (existing?.note ?? null) : body.note?.trim() ? body.note.trim() : null;
      const revision = body.revision === undefined ? (existing?.revision ?? null) : toDbRevision(body.revision);

      if (!completedAt && !note && !revision) {
        if (existing) await tx.problemProgress.delete({ where: { userId_problemId: { userId, problemId } } });
        return emptyRowDTO(problemId, now);
      }

      const data = { completedAt, completedDate, note, revision };
      const row = await tx.problemProgress.upsert({
        where: { userId_problemId: { userId, problemId } },
        create: { userId, problemId, ...data },
        update: data,
      });
      return toRowDTO(row);
    },
    { timeout: 20_000 },
  );
}

export async function clearProgress(userId: string, problemId: string): Promise<void> {
  const problem = await db.problem.findUnique({ where: { id: problemId }, select: { id: true } });
  if (!problem) throw new ApiError("NOT_FOUND", "Unknown problem");
  await db.problemProgress.deleteMany({ where: { userId, problemId } });
}

/** Deletes progress, history and saved preferences. Keeps the account and the study plan. */
export async function resetAll(userId: string): Promise<void> {
  await db.$transaction([
    db.problemProgress.deleteMany({ where: { userId } }),
    db.completionEvent.deleteMany({ where: { userId } }),
    db.userPreferences.deleteMany({ where: { userId } }),
  ]);
}
