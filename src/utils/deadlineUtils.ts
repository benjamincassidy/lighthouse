/**
 * Pure utility functions for deadline tracking and pacing calculations.
 */

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Use this everywhere dates are stored or compared so that users in
 * non-UTC timezones don't see today's activity stamped to tomorrow.
 */
export function localDateISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns an array of YYYY-MM-DD strings (local time) for the last `weeks * 7`
 * days, oldest first. Used to build the writing heatmap without calling
 * `new Date()` inside Svelte components (avoids svelte/prefer-svelte-reactivity).
 */
export function heatmapDateKeys(weeks: number): string[] {
  const days = weeks * 7
  const [ty, tm, td] = localDateISO().split('-').map(Number)
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ty, tm - 1, td - i)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    keys.push(`${y}-${mo}-${day}`)
  }
  return keys
}

/**
 * Returns calendar days remaining until the deadline, including today.
 * Returns 0 if the deadline has passed. Uses UTC dates for consistency
 * with how word-count history is stored (via `new Date().toISOString()`).
 *
 * Example: if today (UTC) is 2026-03-31 and deadline is 2026-04-30, returns 31
 * (31 days to write: March 31 through April 30 inclusive).
 */
export function daysRemaining(deadline: string): number {
  const todayUTC = new Date().toISOString().split('T')[0]
  const msPerDay = 1000 * 60 * 60 * 24
  const todayMs = new Date(todayUTC + 'T00:00:00Z').getTime()
  const endMs = new Date(deadline + 'T00:00:00Z').getTime()
  const diffDays = Math.round((endMs - todayMs) / msPerDay)
  // +1 to include today as a writing day
  return Math.max(0, diffDays + 1)
}

/**
 * Words required per remaining day to reach the word count goal on time.
 * Returns 0 if the goal is already met, the deadline has passed, or no goal set.
 */
export function requiredDaily(wordsLeft: number, daysLeft: number): number {
  if (daysLeft <= 0 || wordsLeft <= 0) return 0
  return Math.ceil(wordsLeft / daysLeft)
}

/**
 * Compute rolling average of daily word counts over the last `days` days.
 * Skips days with no entry — only averages days where the user actually wrote.
 * Returns 0 if no data.
 */
export function rollingAverage(
  dailyWordCounts: Record<string, number> | undefined,
  days = 7,
): number {
  if (!dailyWordCounts) return 0

  const [ty, tm, td] = localDateISO().split('-').map(Number)
  let total = 0
  let count = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(ty, tm - 1, td - i)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const key = `${y}-${mo}-${day}`
    const words = dailyWordCounts[key]
    if (words && words > 0) {
      total += words
      count++
    }
  }

  return count > 0 ? Math.round(total / count) : 0
}

/**
 * Estimated reading time in minutes at 250 wpm.
 */
export function readTime(wordCount: number): number {
  if (wordCount <= 0) return 0
  return Math.ceil(wordCount / 250)
}

/**
 * Estimated speaking time in minutes at 130 wpm.
 */
export function speakTime(wordCount: number): number {
  if (wordCount <= 0) return 0
  return Math.ceil(wordCount / 130)
}

/**
 * Format minutes as a human-readable duration: "2h 15m" or "45m".
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
