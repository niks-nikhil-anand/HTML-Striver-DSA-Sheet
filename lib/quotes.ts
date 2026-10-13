export const DASHBOARD_QUOTES = [
  "Two problems a day. One step closer to your dream.",
  "Consistency beats talent when talent stops practicing.",
  "Solve today. Succeed tomorrow.",
  "Small steps. Strong logic. Big results.",
  "Every problem solved is progress earned.",
  "Your future self is counting on today's effort.",
  "One more problem. One more victory.",
  "Discipline is your greatest algorithm.",
] as const;

export const DIFFICULT_PROBLEM_QUOTES = [
  "If it's hard, you're learning something valuable.",
  "Debug your thinking before you debug your code.",
  "Every wrong answer teaches you a better approach.",
  "Don't memorize the solution. Understand the pattern.",
  "Struggle is part of the algorithm.",
  "A problem unsolved today can become your strength tomorrow.",
  "Think slower. Understand deeper. Solve smarter.",
] as const;

export const STREAK_QUOTES = [
  "Never miss twice.",
  "Protect your streak. Build your future.",
  "You don't need a perfect day. You need a consistent one.",
  "Two problems today. Repeat tomorrow.",
  "Motivation starts the journey. Discipline keeps it alive.",
  "Your streak is proof that you showed up.",
  "Be better than yesterday, not perfect today.",
] as const;

export function dailyQuote(quotes: readonly string[], date: string, offset = 0) {
  const day = Number(date.replaceAll("-", "")) || 0;
  return quotes[(day + offset) % quotes.length];
}
