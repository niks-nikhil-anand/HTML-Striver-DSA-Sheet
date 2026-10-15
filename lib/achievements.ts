/** Stable tags are persisted in the database; names and presentation may evolve. */
const names = ["DSA Beginner", "Building Consistency", "Problem Solver", "DSA Century", "Logic Builder", "Algorithm Explorer", "Coding Practitioner", "Halfway Hero", "Pattern Master", "DSA Silver", "Advanced Problem Solver", "DSA Gold", "Algorithm Specialist", "Interview Ready", "Advanced DSA", "DSA Expert", "Elite Problem Solver", "Final Stretch", "DSA Champion"] as const;
export const ACHIEVEMENTS = names.map((name, index) => {
  const threshold = index === 18 ? 452 : (index + 1) * 25;
  return { name, threshold, tag: `DSA-${String(threshold).padStart(3, "0")}`, champion: threshold === 452 };
});
export interface AchievementDTO { tag: string; unlockedAt: string }
export interface AchievementUpdate { achievements: AchievementDTO[]; newAchievements: AchievementDTO[] }
export function eligibleAchievements(count: number, earned: ReadonlySet<string>) {
  return ACHIEVEMENTS.filter((m) => m.threshold <= count && !earned.has(m.tag));
}
