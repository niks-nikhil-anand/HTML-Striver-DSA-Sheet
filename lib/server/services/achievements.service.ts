import "server-only";
import { eligibleAchievements, type AchievementUpdate } from "@/lib/achievements";
import { PROBLEM_IDS } from "@/lib/problems";
import type { Prisma } from "@/lib/prisma-client/client";

/** Caller holds the user's row lock. Notification consumption commits with the award.
 * A retry never returns an award twice, including after a lost HTTP response. */
export async function awardAchievements(tx: Prisma.TransactionClient, userId: string): Promise<AchievementUpdate> {
  const count = await tx.problemProgress.count({ where: { userId, completedAt: { not: null }, problemId: { in: [...PROBLEM_IDS] } } });
  const existing = await tx.userAchievement.findMany({ where: { userId } });
  const eligible = eligibleAchievements(count, new Set(existing.map((a) => a.tag)));
  const now = new Date();
  if (eligible.length) await tx.userAchievement.createMany({ data: eligible.map((a) => ({ userId, tag: a.tag, unlockedAt: now, notifiedAt: now })) });
  return {
    achievements: [...existing.map((a) => ({ tag: a.tag, unlockedAt: a.unlockedAt.toISOString() })), ...eligible.map((a) => ({ tag: a.tag, unlockedAt: now.toISOString() }))],
    newAchievements: eligible.map((a) => ({ tag: a.tag, unlockedAt: now.toISOString() })),
  };
}
