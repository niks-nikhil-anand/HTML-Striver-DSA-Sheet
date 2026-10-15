import { ACHIEVEMENTS, type AchievementDTO } from "./achievements";

export type MilestoneStatus = "all" | "unlocked" | "locked";
export function milestoneStatus(value: string | null): MilestoneStatus {
  return value === "unlocked" || value === "locked" ? value : "all";
}
export function milestoneSummary(done: number, achievements: readonly AchievementDTO[]) {
  const earned = new Map(achievements.filter((a) => ACHIEVEMENTS.some((m) => m.tag === a.tag)).map((a) => [a.tag, a]));
  const unlocked = ACHIEVEMENTS.filter((m) => earned.has(m.tag));
  const latest = [...unlocked].sort((a, b) => Date.parse(earned.get(b.tag)!.unlockedAt) - Date.parse(earned.get(a.tag)!.unlockedAt) || b.threshold - a.threshold)[0];
  const next = ACHIEVEMENTS.find((m) => !earned.has(m.tag));
  return { earned, unlocked, latest, next, remaining: next ? Math.max(0, next.threshold - done) : 0 };
}
export function filterMilestones(query: string, status: MilestoneStatus, earned: ReadonlyMap<string, AchievementDTO>) {
  const term = query.trim().toLowerCase();
  return ACHIEVEMENTS.filter((m) => (!term || `${m.name} ${m.tag} ${m.threshold}`.toLowerCase().includes(term)) && (status === "all" || earned.has(m.tag) === (status === "unlocked")));
}
