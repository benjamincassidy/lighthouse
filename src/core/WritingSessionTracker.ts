import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'
import { rollingAverage } from '@/utils/deadlineUtils'

interface TrackerState {
  sessionBaselineWords: number
  todayDate: string // YYYY-MM-DD
  todayBaselineWords: number
}

/**
 * Tracks per-session and per-day word count deltas.
 *
 * Extracted from StatsPanel so Sprint Mode and Analytics can share the same
 * data without duplicating state management. Registered on the plugin instance
 * as `plugin.sessionTracker`.
 */
export class WritingSessionTracker {
  private plugin: LighthousePlugin
  private state: TrackerState | null = null
  private trackedProjectId: string | null = null

  constructor(plugin: LighthousePlugin) {
    this.plugin = plugin
  }

  /**
   * Initialize (or reinitialize) session tracking for a project.
   *
   * - Always resets the **session** baseline to `currentWordCount`
   *   (sessions do not persist across plugin reloads).
   * - Loads today's baseline from the project's persisted data.
   * - If today is a new day, seeds a fresh today-baseline and persists it.
   */
  async initSession(project: Project, currentWordCount: number): Promise<void> {
    const today = this.todayISO()
    const isNewDay = project.todayWordCountDate !== today

    let todayBaseline: number
    if (isNewDay) {
      todayBaseline = currentWordCount
      await this.plugin.projectManager.updateProject({
        ...project,
        todayWordCountBaseline: currentWordCount,
        todayWordCountDate: today,
      })
    } else {
      todayBaseline = project.todayWordCountBaseline ?? currentWordCount
    }

    this.state = {
      sessionBaselineWords: currentWordCount,
      todayDate: today,
      todayBaselineWords: todayBaseline,
    }
    this.trackedProjectId = project.id
  }

  /**
   * Returns words written this session.
   *
   * If the word count dips below the session baseline (e.g. the user deleted
   * a large section), the baseline slides down so that subsequent typing is
   * counted forward from the new low-water mark.
   */
  getSessionDelta(currentWordCount: number): number {
    if (!this.state) return 0
    if (currentWordCount < this.state.sessionBaselineWords) {
      this.state.sessionBaselineWords = currentWordCount
    }
    return Math.max(0, currentWordCount - this.state.sessionBaselineWords)
  }

  /**
   * Returns words written today.
   * Handles midnight rollover transparently by resetting the today-baseline.
   */
  getTodayDelta(currentWordCount: number): number {
    if (!this.state) return 0
    const today = this.todayISO()
    if (today !== this.state.todayDate) {
      this.state.todayDate = today
      this.state.todayBaselineWords = currentWordCount
    }
    return Math.max(0, currentWordCount - this.state.todayBaselineWords)
  }

  /**
   * Persist today's baseline and today's word delta back to the project.
   * Call periodically (e.g. every few minutes) so the plugin can recover
   * the correct today-delta after a reload, and to build the daily history
   * for rolling averages and the heatmap.
   *
   * @param currentWordCount - current live project word count (used to derive today's delta)
   */
  async snapshotToday(project: Project, currentWordCount: number): Promise<void> {
    if (!this.state) return
    const today = this.todayISO()
    const todayDelta = Math.max(0, currentWordCount - this.state.todayBaselineWords)

    // Build updated daily history, pruning entries older than 120 days
    const existingCounts = project.dailyWordCounts ?? {}
    const updatedCounts: Record<string, number> = { ...existingCounts, [today]: todayDelta }
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 120)
    const cutoffKey = cutoff.toISOString().split('T')[0]
    for (const key of Object.keys(updatedCounts)) {
      if (key < cutoffKey) delete updatedCounts[key]
    }

    const baselineUnchanged =
      project.todayWordCountBaseline === this.state.todayBaselineWords &&
      project.todayWordCountDate === today
    const historyUnchanged = existingCounts[today] === todayDelta

    if (baselineUnchanged && historyUnchanged) return

    await this.plugin.projectManager.updateProject({
      ...project,
      todayWordCountBaseline: this.state.todayBaselineWords,
      todayWordCountDate: today,
      dailyWordCounts: updatedCounts,
    })
  }

  /**
   * Rolling average of daily word output over the last `days` days.
   * Only counts days with a recorded non-zero entry.
   */
  getRollingAverage(project: Project, days = 7): number {
    return rollingAverage(project.dailyWordCounts, days)
  }

  isInitialized(): boolean {
    return this.state !== null
  }

  isTrackingProject(projectId: string): boolean {
    return this.trackedProjectId === projectId
  }

  reset(): void {
    this.state = null
    this.trackedProjectId = null
  }

  private todayISO(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
}
