/**
 * Calculates the normalized progress (0–1) toward a word count goal.
 * Returns 0 if goal is non-positive, clamps result to [0, 1].
 */
export function calcGoalPercent(wordCount: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(wordCount / goal, 1)
}
