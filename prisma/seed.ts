// Idempotent: upserts the sheet from data/problems.json by id. Safe to run on every deploy.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/prisma-client/client";
import problems from "../data/problems.json";

type Raw = {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tier?: string;
  url: string;
  tufUrl: string;
  leetcodeUrl?: string;
  gfgUrl?: string;
  solutionUrl?: string;
  javaSolutionUrl?: string;
};

const DIFFICULTY = { Easy: "EASY", Medium: "MEDIUM", Hard: "HARD" } as const;

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const list = problems as Raw[];
  const rows = list.map((p, i) => ({
    id: p.id,
    data: {
      order: i + 1,
      title: p.title,
      topic: p.topic,
      subtopic: p.subtopic,
      difficulty: DIFFICULTY[p.difficulty],
      tier: p.tier ?? null,
      url: p.url,
      tufUrl: p.tufUrl,
      leetcodeUrl: p.leetcodeUrl ?? null,
      gfgUrl: p.gfgUrl ?? null,
      solutionUrl: p.solutionUrl ?? null,
      javaSolutionUrl: p.javaSolutionUrl ?? null,
    },
  }));

  // Chunked so each transaction stays well inside Prisma's timeout on a remote database.
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    await db.$transaction(
      chunk.map((r) => db.problem.upsert({ where: { id: r.id }, create: { id: r.id, ...r.data }, update: r.data })),
      { timeout: 60_000 },
    );
  }

  const count = await db.problem.count();
  console.log(`Seeded ${list.length} problems (table now has ${count}).`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
