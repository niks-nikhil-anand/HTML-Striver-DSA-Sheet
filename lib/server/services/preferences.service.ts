import "server-only";
import { DEFAULT_FILTERS, type Filters, type Preferences } from "@/lib/types";
import { db } from "../db";

const DEFAULT_PREFS: Preferences = { filters: { ...DEFAULT_FILTERS }, celebratedMilestones: [] };

function merge(stored: { filters: unknown; celebratedMilestones: number[] } | null): Preferences {
  if (!stored) return DEFAULT_PREFS;
  return {
    filters: { ...DEFAULT_FILTERS, ...(stored.filters as Partial<Filters>) },
    celebratedMilestones: stored.celebratedMilestones,
  };
}

export async function getPreferences(userId: string): Promise<Preferences> {
  return merge(await db.userPreferences.findUnique({ where: { userId } }));
}

export async function patchPreferences(
  userId: string,
  patch: { filters?: Partial<Filters>; celebratedMilestones?: number[] },
): Promise<Preferences> {
  const current = await getPreferences(userId);
  const next: Preferences = {
    filters: { ...current.filters, ...patch.filters },
    celebratedMilestones: patch.celebratedMilestones ?? current.celebratedMilestones,
  };
  const row = await db.userPreferences.upsert({
    where: { userId },
    create: { userId, filters: { ...next.filters }, celebratedMilestones: next.celebratedMilestones },
    update: { filters: { ...next.filters }, celebratedMilestones: next.celebratedMilestones },
  });
  return merge(row);
}
