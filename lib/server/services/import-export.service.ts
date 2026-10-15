import "server-only";
import { awardAchievements } from "./achievements.service";
import type { ImportResultDTO } from "@/lib/api-types";
import { PROBLEM_IDS } from "@/lib/problems";
import { exportProgress, validateProgress } from "@/lib/progress";
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
 * The file is validated with the SAME validator the browser uses (lib/progress.ts).
 */
export async function importProgress(userId: string, data: unknown, mode: "replace" | "merge"): Promise<ImportResultDTO> {
  const valid = validateProgress(data, PROBLEM_IDS);
  if (!valid) throw new ApiError("VALIDATION", "That file is not a valid DSA Tracker export");

  const ids = [...new Set([...Object.keys(valid.completed), ...Object.keys(valid.notes), ...Object.keys(valid.revision)])];
  const skipped = Math.max(0, countRawIds(data) - ids.length);

  const awards = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (mode === "replace") {
        await tx.problemProgress.deleteMany({ where: { userId } });
        await tx.studyPlan.upsert({
          where: { userId },
          create: { userId, startDate: toDateOnly(valid.startDate) },
          update: { startDate: toDateOnly(valid.startDate) },
        });
        const prefs = { ui: { ...valid.prefs.ui, theme: valid.prefs.ui?.theme ?? "system", sidebarCollapsed: valid.prefs.ui?.sidebarCollapsed ?? false }, filters: { ...valid.prefs.filters }, celebratedMilestones: valid.prefs.celebratedMilestones };
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
        return awardAchievements(tx, userId);
      }

      await tx.studyPlan.upsert({ where: { userId }, create: { userId, startDate: toDateOnly(valid.startDate) }, update: {} });
      const existing = new Map((await tx.problemProgress.findMany({ where: { userId, problemId: { in: ids } } })).map((r) => [r.problemId, r]));
      const missing = ids.filter((id) => !existing.has(id));
      if (missing.length) await tx.problemProgress.createMany({ data: missing.map((id) => {
        const c = valid.completed[id];
        return { userId, problemId: id, completedAt: c ? new Date(c.at) : null, completedDate: c ? toDateOnly(c.date) : null, note: valid.notes[id] ?? null, revision: toDbRevision(valid.revision[id]) };
      }) });
      for (const id of ids) {
        if (!existing.has(id)) continue;
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
        if (ex && ex.completedAt?.getTime() === data.completedAt?.getTime() && ex.completedDate?.getTime() === data.completedDate?.getTime() && ex.note === data.note && ex.revision === data.revision) continue;
        await tx.problemProgress.upsert({
          where: { userId_problemId: { userId, problemId: id } },
          create: { userId, problemId: id, ...data },
          update: data,
        });
      }
      return awardAchievements(tx, userId);
    },
    { timeout: 60_000 },
  );

  return { imported: ids.length, skipped, ...awards };
}
