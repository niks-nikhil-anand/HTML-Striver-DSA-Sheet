import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { PROBLEMS } from "@/lib/problems";
import { defaultProgress } from "@/lib/progress";
import { importProgress } from "@/lib/server/services/import-export.service";
import { putProgress, resetAll } from "@/lib/server/services/progress.service";
import { getSnapshot } from "@/lib/server/services/snapshot.service";

const userId = `test-achievements-${crypto.randomUUID()}`;
const today = new Date().toISOString().slice(0, 10);
afterAll(async () => { await db.user.deleteMany({ where: { id: userId } }); await db.$disconnect(); });
describe("permanent database achievements", () => {
  it("serializes concurrent threshold crossings and never repeats notifications", async () => {
    await db.user.create({ data: { id: userId, email: `${userId}@example.test` } });
    await db.problemProgress.createMany({ data: PROBLEMS.slice(0, 24).map((p) => ({ userId, problemId: p.id, completedAt: new Date(), completedDate: new Date(`${today}T00:00:00Z`) })) });
    expect((await getSnapshot(userId)).achievements).toEqual([]); // GET is not an award mutation
    const results = await Promise.all(PROBLEMS.slice(24, 26).map((p) => putProgress(userId, p.id, { completed: true, localDate: today })));
    expect(results.flatMap((r) => r.newAchievements ?? []).map((a) => a.tag)).toEqual(["DSA-025"]);
    const retry = await putProgress(userId, PROBLEMS[24].id, { completed: true, localDate: today });
    expect(retry.newAchievements).toEqual([]);
    expect(await db.userAchievement.count({ where: { userId } })).toBe(1);
  });
  it("retains awards through unchecking and reset", async () => {
    await putProgress(userId, PROBLEMS[24].id, { completed: false });
    await resetAll(userId);
    const snapshot = await getSnapshot(userId);
    expect(Object.keys(snapshot.completed)).toHaveLength(0);
    expect(snapshot.achievements?.map((a) => a.tag)).toEqual(["DSA-025"]);
  });
  it("awards all imported thresholds once, survives repeated import and excludes unknown ids", async () => {
    const progress = defaultProgress();
    progress.completed = Object.fromEntries(PROBLEMS.map((p) => [p.id, { at: Date.now(), date: today }]));
    progress.completed["unknown-problem"] = { at: Date.now(), date: today };
    const imported = await importProgress(userId, progress, "replace");
    expect(imported.achievements).toHaveLength(19);
    expect(imported.newAchievements).toHaveLength(18);
    expect(imported.skipped).toBe(1);
    expect((await importProgress(userId, progress, "merge")).newAchievements).toEqual([]);
    expect(await db.userAchievement.count({ where: { userId, notifiedAt: { not: null } } })).toBe(19);
  });
});
