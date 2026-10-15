// Idempotent silent backfill. Does not alter progress or replay historical celebrations.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/prisma-client/client";
import { eligibleAchievements } from "../lib/achievements";
import problems from "../data/problems.json";

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    let created = 0;
    for (const { id: userId } of await db.user.findMany({ select: { id: true } })) {
      created += await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const count = await tx.problemProgress.count({ where: { userId, completedAt: { not: null }, problemId: { in: problems.map((p) => p.id) } } });
        const earned = await tx.userAchievement.findMany({ where: { userId } });
        const eligible = eligibleAchievements(count, new Set(earned.map((a) => a.tag)));
        if (!eligible.length) return 0;
        return (await tx.userAchievement.createMany({ data: eligible.map((m) => ({ userId, tag: m.tag, notifiedAt: new Date() })), skipDuplicates: true })).count;
      });
    }
    console.log(`Backfilled ${created} achievements without notifications.`);
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
