import "server-only";
import type { SnapshotDTO } from "@/lib/api-types";
import type { Progress } from "@/lib/types";
import { db } from "../db";
import { fromDateOnly, fromDbRevision } from "../mappers";
import { getOrCreatePlan } from "./plan.service";
import { getPreferences } from "./preferences.service";

/** The user's whole state in the SAME shape the frontend already uses (`Progress`), plus row timestamps. */
export async function getSnapshot(userId: string): Promise<SnapshotDTO> {
  const [plan, prefs, rows, achievements] = await Promise.all([
    getOrCreatePlan(userId),
    getPreferences(userId),
    db.problemProgress.findMany({ where: { userId } }),
    db.userAchievement.findMany({ where: { userId } }),
  ]);

  const progress: Progress = { version: 1, startDate: plan.startDate, completed: {}, notes: {}, revision: {}, prefs };
  const rowUpdatedAt: Record<string, string> = {};
  for (const r of rows) {
    rowUpdatedAt[r.problemId] = r.updatedAt.toISOString();
    if (r.completedAt && r.completedDate) progress.completed[r.problemId] = { date: fromDateOnly(r.completedDate), at: r.completedAt.getTime() };
    if (r.note) progress.notes[r.problemId] = r.note;
    const rev = fromDbRevision(r.revision);
    if (rev) progress.revision[r.problemId] = rev;
  }
  return { ...progress, rowUpdatedAt, achievements: achievements.map((a) => ({ tag: a.tag, unlockedAt: a.unlockedAt.toISOString() })) };
}
