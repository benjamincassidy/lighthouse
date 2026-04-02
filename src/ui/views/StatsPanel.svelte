<script lang="ts">
  import { onMount } from 'svelte'

  import { activeProject } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import {
    computeStreak,
    daysRemaining,
    formatDuration,
    localDateISO,
    readTime,
    requiredDaily,
    speakTime,
  } from '@/utils/deadlineUtils'

  import type { TFile } from 'obsidian'

  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  let currentFile = $state<TFile | null>(null)
  let fileWordCount = $state(0)
  let folderWordCount = $state(0)
  let projectWordCount = $state(0)
  let sessionWordCount = $state(0)
  let todayWordCount = $state(0)
  let updateDebounceTimer = $state<number | null>(null)

  // Derived values
  let project = $derived.by(() => {
    try {
      return activeProject ? $activeProject : undefined
    } catch (e) {
      console.error('Lighthouse StatsPanel: Error accessing activeProject store:', e)
      return undefined
    }
  })

  let projectGoal = $derived(project?.wordCountGoal)
  let goalDirection = $derived(project?.goalDirection ?? 'at-least')

  // Per-file goal for the currently active file
  let fileGoal = $derived(
    currentFile && project?.fileGoals ? project.fileGoals[currentFile.path] : undefined,
  )
  let fileGoalPercent = $derived(
    fileGoal && fileWordCount > 0 ? Math.min((fileWordCount / fileGoal) * 100, 100) : 0,
  )
  let fileGoalExceeded = $derived(fileGoal !== undefined && fileWordCount > fileGoal)

  // Calculate progress percentage
  let progressPercent = $derived(
    projectGoal && projectWordCount > 0 ? Math.min((projectWordCount / projectGoal) * 100, 100) : 0,
  )
  let projectGoalExceeded = $derived(
    goalDirection === 'at-most' && projectGoal !== undefined && projectWordCount > projectGoal,
  )

  // Deadline / pacing
  let deadline = $derived(project?.deadline)
  let daysLeft = $derived(deadline ? daysRemaining(deadline) : 0)
  let wordsLeft = $derived(projectGoal ? Math.max(0, projectGoal - projectWordCount) : 0)
  let requiredDailyWords = $derived(
    deadline && projectGoal ? requiredDaily(wordsLeft, daysLeft) : 0,
  )
  let rollingAvg = $derived(project ? plugin.sessionTracker.getRollingAverage(project, 7) : 0)

  // Read / speak time
  let readTimeMinutes = $derived(readTime(projectWordCount))
  let speakTimeMinutes = $derived(speakTime(projectWordCount))

  // Streak tracking
  const todayKey = localDateISO()
  let streak = $derived(computeStreak(project?.dailyWordCounts, project?.daysOff ?? []))
  let todayIsOff = $derived(project?.daysOff?.includes(todayKey) ?? false)
  let todayHasWriting = $derived((project?.dailyWordCounts?.[todayKey] ?? 0) > 0)

  async function toggleDayOff() {
    if (!project) return
    const offs = [...(project.daysOff ?? [])]
    const idx = offs.indexOf(todayKey)
    if (idx === -1) offs.push(todayKey)
    else offs.splice(idx, 1)
    await plugin.projectManager.updateProject({ ...project, daysOff: offs })
  }

  // Update stats when active file changes
  async function updateStats() {
    const activeFile = plugin.app.workspace.getActiveFile()

    // Reset file/folder counts if no active markdown file
    if (!activeFile || activeFile.extension !== 'md') {
      currentFile = null
      fileWordCount = 0
      folderWordCount = 0
      // Don't return - still calculate project word count below
    } else {
      currentFile = activeFile

      // Get file word count
      const fileResult = await plugin.hierarchicalCounter.countFile(activeFile)
      fileWordCount = fileResult?.words || 0

      // Get folder word count - count the entire folder, not filtered by project
      const folder = activeFile.parent
      if (folder) {
        const folderResult = await plugin.hierarchicalCounter.countFolder(folder.path)
        folderWordCount = folderResult?.wordCount || 0
      } else {
        folderWordCount = 0
      }
    }

    // Always get project word count if we have a project
    if (project) {
      const projectResult = await plugin.hierarchicalCounter.countProject(project)
      projectWordCount = projectResult.totalWords

      // Delegate session/today tracking to the shared WritingSessionTracker
      if (!plugin.sessionTracker.isTrackingProject(project.id)) {
        await plugin.sessionTracker.initSession(project, projectWordCount)
      }
      sessionWordCount = plugin.sessionTracker.getSessionDelta(projectWordCount)
      todayWordCount = plugin.sessionTracker.getTodayDelta(projectWordCount)

      // Persist daily history for rolling average + heatmap
      await plugin.sessionTracker.snapshotToday(project, projectWordCount)
    } else {
      projectWordCount = 0
      sessionWordCount = 0
      todayWordCount = 0
    }
  }

  // Debounced update for editor changes (typing)
  function debouncedUpdate() {
    if (updateDebounceTimer !== null) {
      // eslint-disable-next-line no-undef
      window.clearTimeout(updateDebounceTimer)
    }
    // eslint-disable-next-line no-undef
    updateDebounceTimer = window.setTimeout(() => {
      updateStats()
      updateDebounceTimer = null
    }, 200) // Update 200ms after user stops typing
  }

  // Setup listeners when component mounts
  onMount(() => {
    if (!plugin) {
      console.error('Lighthouse: StatsPanel plugin is undefined')
      return
    }

    const workspace = plugin.app.workspace

    // Update when active leaf changes
    plugin.registerEvent(
      workspace.on('active-leaf-change', () => {
        updateStats()
      }),
    )

    // Update when file is opened
    plugin.registerEvent(
      workspace.on('file-open', () => {
        updateStats()
      }),
    )

    // Update when file is modified
    plugin.registerEvent(
      workspace.on('editor-change', () => {
        debouncedUpdate() // Use debounced version for typing
      }),
    )

    // Initial update - wait a tick for stores and workspace to be ready
    // eslint-disable-next-line no-undef
    setTimeout(async () => {
      await updateStats()
    }, 100)

    // Also trigger update after a longer delay to catch late-loading files
    // eslint-disable-next-line no-undef
    setTimeout(() => {
      updateStats()
    }, 500)
  })
  // Update when project changes
  $effect(() => {
    if (plugin && project) {
      updateStats()
    }
  })

  function formatNumber(num: number | undefined): string {
    if (num === undefined || num === null) {
      return '0'
    }
    return num.toLocaleString()
  }
</script>

<div class="lighthouse-stats-panel">
  <div class="lighthouse-stats-header">
    <h3>Writing Stats</h3>
  </div>

  {#if !project}
    <div class="pane-empty">
      No active project<br />
      <span class="pane-empty-message">Select a project to see stats</span>
    </div>
  {:else}
    <div class="lighthouse-stats-content">
      <!-- Current File Stats -->
      {#if currentFile}
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Current File</div>
          <div class="lighthouse-stat-value">{formatNumber(fileWordCount)}</div>
          <div class="lighthouse-stat-sublabel">{currentFile.name}</div>
        </div>

        {#if fileGoal}
          <div class="lighthouse-progress-bar">
            <div
              class="lighthouse-progress-fill"
              class:lighthouse-progress-exceeded={fileGoalExceeded}
              style="width: {fileGoalPercent}%"
            ></div>
          </div>
          <div class="lighthouse-stat-sublabel">
            {formatNumber(fileWordCount)} / {formatNumber(fileGoal)} words
            {#if fileGoalExceeded}· over limit{/if}
          </div>
        {/if}

        <div class="lighthouse-stats-divider"></div>

        <!-- Folder Stats -->
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Current Folder</div>
          <div class="lighthouse-stat-value">{formatNumber(folderWordCount)}</div>
          <div class="lighthouse-stat-sublabel">{currentFile.parent?.name || 'Root'}</div>
        </div>

        <div class="lighthouse-stats-divider"></div>
      {/if}

      <!-- Project Stats -->
      <div class="lighthouse-stat-group">
        <div class="lighthouse-stat-label">Project Total</div>
        <div class="lighthouse-stat-value lighthouse-stat-value-primary">
          {formatNumber(projectWordCount)}
        </div>
        <div class="lighthouse-stat-sublabel">{project.name}</div>
      </div>

      <!-- Progress Bar -->
      {#if projectGoal}
        <div class="lighthouse-stats-divider"></div>

        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Goal Progress</div>
          <div class="lighthouse-progress-bar">
            <div
              class="lighthouse-progress-fill"
              class:lighthouse-progress-exceeded={projectGoalExceeded}
              style="width: {progressPercent}%"
            ></div>
          </div>
          <div class="lighthouse-stat-sublabel">
            {formatNumber(projectWordCount)} / {formatNumber(projectGoal)} words ({Math.round(
              progressPercent,
            )}%){#if projectGoalExceeded}
              · over limit{/if}
          </div>
        </div>
      {/if}

      <!-- Today + Session side by side -->
      <div class="lighthouse-stats-divider"></div>
      <div class="lighthouse-session-stats">
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Today</div>
          <div class="lighthouse-stat-value lighthouse-stat-value-accent lighthouse-delta">
            +{formatNumber(todayWordCount)}
          </div>
        </div>
        <div class="lighthouse-session-divider"></div>
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Session</div>
          <div class="lighthouse-stat-value lighthouse-stat-value-accent lighthouse-delta">
            +{formatNumber(sessionWordCount)}
          </div>
        </div>
      </div>

      <!-- Deadline pacing -->
      {#if deadline && projectGoal}
        <div class="lighthouse-stats-divider"></div>
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Deadline</div>
          <div class="lighthouse-stat-value">{formatNumber(requiredDailyWords)}</div>
          <div class="lighthouse-stat-sublabel">
            words/day needed &middot; {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </div>
        </div>
        {#if rollingAvg > 0}
          <div class="lighthouse-stat-group">
            <div class="lighthouse-stat-label">7-day avg</div>
            <div class="lighthouse-stat-value">{formatNumber(rollingAvg)}</div>
            <div
              class="lighthouse-stat-sublabel"
              class:lighthouse-pace-ahead={rollingAvg >= requiredDailyWords}
              class:lighthouse-pace-behind={rollingAvg < requiredDailyWords}
            >
              {rollingAvg >= requiredDailyWords ? 'on pace' : 'behind pace'}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Read / speak time -->
      {#if projectWordCount > 0}
        <div class="lighthouse-stats-divider"></div>
        <div class="lighthouse-session-stats">
          <div class="lighthouse-stat-group">
            <div class="lighthouse-stat-label">Read time</div>
            <div class="lighthouse-stat-value lighthouse-stat-value-secondary">
              {formatDuration(readTimeMinutes)}
            </div>
          </div>
          <div class="lighthouse-session-divider"></div>
          <div class="lighthouse-stat-group">
            <div class="lighthouse-stat-label">Speak time</div>
            <div class="lighthouse-stat-value lighthouse-stat-value-secondary">
              {formatDuration(speakTimeMinutes)}
            </div>
          </div>
        </div>
      {/if}

      <!-- Writing streak -->
      {#if streak.current > 0 || streak.longest > 0 || todayIsOff}
        <div class="lighthouse-stats-divider"></div>
        <div class="lighthouse-stat-group">
          <div class="lighthouse-stat-label">Streak</div>
          <div class="lighthouse-streak-row">
            <div class="lighthouse-stat-value">
              {streak.current} day{streak.current !== 1 ? 's' : ''}
            </div>
            {#if !todayHasWriting}
              <button class="lighthouse-dayoff-btn" onclick={toggleDayOff}>
                {todayIsOff ? 'Unmark rest day' : 'Mark rest day'}
              </button>
            {/if}
          </div>
          {#if streak.longest > streak.current}
            <div class="lighthouse-stat-sublabel">Best: {streak.longest} days</div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lighthouse-stats-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: var(--size-4-2);
  }

  .lighthouse-stats-header {
    margin-bottom: var(--size-4-4);
  }

  .lighthouse-stats-header h3 {
    margin: 0;
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }

  .pane-empty-message {
    color: var(--text-faint);
    font-size: var(--font-ui-smaller);
  }

  .lighthouse-stats-content {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-3);
  }

  .lighthouse-stat-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2-1);
  }

  .lighthouse-stat-label {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .lighthouse-stat-value {
    font-size: var(--font-ui-larger);
    font-weight: 600;
    color: var(--text-normal);
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-stat-value-primary {
    font-size: 2em;
    color: var(--lh-accent);
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-stat-value-accent {
    color: var(--lh-accent);
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-delta {
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-stat-sublabel {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
  }

  .lighthouse-stats-divider {
    height: 1px;
    background: var(--background-modifier-border);
  }

  .lighthouse-session-stats {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--size-4-2);
    align-items: center;
  }

  .lighthouse-session-divider {
    width: 1px;
    height: 2em;
    background: var(--background-modifier-border);
    justify-self: center;
  }

  .lighthouse-progress-bar {
    width: 100%;
    height: 8px;
    background: var(--background-modifier-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .lighthouse-progress-fill {
    height: 100%;
    background: var(--lh-accent);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .lighthouse-progress-exceeded {
    background: var(--color-red);
  }

  .lighthouse-stat-value-secondary {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-pace-ahead {
    color: var(--color-green);
  }

  .lighthouse-pace-behind {
    color: var(--color-orange);
  }

  .lighthouse-streak-row {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
  }

  .lighthouse-dayoff-btn {
    font-size: var(--font-ui-smaller);
    color: var(--text-faint);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .lighthouse-dayoff-btn:hover {
    color: var(--text-muted);
  }
</style>
