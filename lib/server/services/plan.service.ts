import "server-only";
import { DEFAULT_START_DATE } from "@/lib/schedule";
import { db } from "../db";
import { fromDateOnly, toDateOnly } from "../mappers";

export async function getOrCreatePlan(userId: string) {
  const plan = await db.studyPlan.upsert({
    where: { userId },
    create: { userId, startDate: toDateOnly(DEFAULT_START_DATE) },
    update: {},
  });
  return { startDate: fromDateOnly(plan.startDate), perDay: plan.perDay };
}

export async function putPlan(userId: string, startDate: string) {
  const plan = await db.studyPlan.upsert({
    where: { userId },
    create: { userId, startDate: toDateOnly(startDate) },
    update: { startDate: toDateOnly(startDate) },
  });
  return { startDate: fromDateOnly(plan.startDate), perDay: plan.perDay };
}
