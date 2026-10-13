import "server-only";
import type { ImportResultDTO } from "@/lib/api-types";
import { PROBLEM_IDS } from "@/lib/problems";
import { exportProgress, validateProgress } from "@/lib/storage";
import { db } from "../db";
import { ApiError } from "../errors";
import { toDateOnly, toDbRevision } from "../mappers";
import { getSnapshot } from "./snapshot.service";

export async function exportForUser(userId: string): Promise<string> {
  const { rowUpdatedAt: _ignored, ...progress } = await getSnapshot(userId);
  void _ignored;
  return exportProgress(progress);
}

function countRawIds(data: unknown): number {
  if (typeof data !== "object" || data === null) return 0;
  const d = data as Record<string, unknown>;
  const ids = new Set<string>();
  for (const key of ["completed", "notes", "revision"]) {
    const part = d[key];
    if (part && typeof part === "object") for (const id of Object.keys(part)) ids.add(id);
  }
  return ids.size;
}

/**
 * replace: wipe this user's progress and write the file's contents.
 * merge:   union. A problem counts as completed if either side has it (earliest date wins);
 *          existing notes/revision win over imported ones; existing plan and preferences are kept.
 * The file is validated with the SAME validator the browser uses (lib/storage.ts).
 */
export async function importProgress(userId: string, data: unknown, mode: "replace" | "merge"): Promise<ImportResultDTO> {
  const valid = validateProgress(data, PROBLEM_IDS);
  if (!valid) throw new ApiError("VALIDATION", "That file is not a valid DSA Tracker export");

  const ids = [...new Set([...Object.keys(valid.completed), ...Object.keys(valid.notes), ...Object.keys(valid.revision)])];
  const skipped = Math.max(0, countRawIds(data) - ids.length);

  await db.$transaction(
    async (tx) => {
      if (mode === "replace") {
        await tx.problemProgress.deleteMany({ where: { userId } });
        await tx.studyPlan.upsert({
          where: { userId },
          create: { userId, startDate: toDateOnly(valid.startDate) },
          update: { startDate: toDateOnly(valid.startDate) },
        });
        const prefs = { filters: { ...valid.prefs.filters }, celebratedMilestones: valid.prefs.celebratedMilestones };
        await tx.userPreferences.upsert({ where: { userId }, create: { userId, ...prefs }, update: prefs });
        await tx.problemProgress.createMany({
          data: ids.map((id) => {
            const c = valid.completed[id];
            return {
              userId,
              problemId: id,
              completedAt: c ? new Date(c.at) : null,
              completedDate: c ? toDateOnly(c.date) : null,
              note: valid.notes[id] ?? null,
              revision: toDbRevision(valid.revision[id]),
            };
          }),
        });
        return;
      }

      await tx.studyPlan.upsert({ where: { userId }, create: { userId, startDate: toDateOnly(valid.startDate) }, update: {} });
      const existing = new Map((await tx.problemProgress.findMany({ where: { userId, problemId: { in: ids } } })).map((r) => [r.problemId, r]));
      for (const id of ids) {
        const c = valid.completed[id];
        const ex = existing.get(id);
        let completedAt = ex?.completedAt ?? null;
        let completedDate = ex?.completedDate ?? null;
        if (c) {
          const importedDate = toDateOnly(c.date);
          if (!completedAt || !completedDate || importedDate < completedDate) {
            completedAt = new Date(c.at);
            completedDate = importedDate;
          }
        }
        const data = {
          completedAt,
          completedDate,
          note: ex?.note ?? valid.notes[id] ?? null,
          revision: ex?.revision ?? toDbRevision(valid.revision[id]),
        };
        await tx.problemProgress.upsert({
          where: { userId_problemId: { userId, problemId: id } },
          create: { userId, problemId: id, ...data },
          update: data,
        });
      }
    },
    { timeout: 60_000 },
  );

  return { imported: ids.length, skipped };
}
