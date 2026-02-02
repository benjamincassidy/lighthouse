<script lang="ts">
  import { onMount } from 'svelte'

  import { activeProject } from '@/core/stores'
  import type LighthousePlugin from '@/main'

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

  // Baseline word counts for session and today tracking
  // Initialize to high number to prevent flash on first render
  let sessionStartWordCount = $state(Number.MAX_SAFE_INTEGER)
  let todayStartWordCount = $state(0)
  let todayStartDate = $state('')

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

  // Calculate progress percentage
  let progressPercent = $derived(
    projectGoal && projectWordCount > 0 ? Math.min((projectWordCount / projectGoal) * 100, 100) : 0,
  )

  // Initialize today tracking from settings on mount
  $effect(() => {
    if (plugin && todayStartDate === '') {
      todayStartWordCount = plugin.settings.todayWordCountBaseline
      todayStartDate = plugin.settings.todayWordCountDate || ''
    }
  })

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

      // Update session and today stats
      updateSessionAndTodayStats()
    } else {
      projectWordCount = 0
      sessionWordCount = 0
      todayWordCount = 0
    }
  }

  // Update session and today word count deltas
  function updateSessionAndTodayStats() {
    const currentDate = new Date().toDateString()

    // Check if day has changed
    if (currentDate !== todayStartDate) {
      todayStartDate = currentDate
      todayStartWordCount = projectWordCount
      // Also reset session on new day
      sessionStartWordCount = projectWordCount

      // Persist to settings
      plugin.settings.todayWordCountBaseline = todayStartWordCount
      plugin.settings.todayWordCountDate = todayStartDate
      plugin.saveSettings()
    }

    // If we've deleted words below the session baseline, adjust the baseline down
    // This ensures the counter responds immediately to new typing after deletions
    if (projectWordCount < sessionStartWordCount) {
      sessionStartWordCount = projectWordCount
    }

    // Calculate deltas - clamp to 0 (no negative counts)
    sessionWordCount = Math.max(0, projectWordCount - sessionStartWordCount)
    todayWordCount = Math.max(0, projectWordCount - todayStartWordCount)
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
      // Get initial word count
      await updateStats()

      // Now set correct baselines after getting word count
      if (project) {
        // ALWAYS reset session baseline on startup - sessions don't persist across restarts
        sessionStartWordCount = projectWordCount

        // Only update today baseline if it's a new day
        const currentDate = new Date().toDateString()
        if (currentDate !== plugin.settings.todayWordCountDate) {
          todayStartWordCount = projectWordCount
          todayStartDate = currentDate
          plugin.settings.todayWordCountBaseline = todayStartWordCount
          plugin.settings.todayWordCountDate = todayStartDate
          plugin.saveSettings()
        }

        // Recalculate session/today stats now that baselines are set
        updateSessionAndTodayStats()
      }
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
            <div class="lighthouse-progress-fill" style="width: {progressPercent}%"></div>
          </div>
          <div class="lighthouse-stat-sublabel">
            {formatNumber(projectWordCount)} / {formatNumber(projectGoal)} words ({Math.round(
              progressPercent,
            )}%)
          </div>
        </div>
      {/if}

      <!-- Session Stats (placeholder for now) -->
      <div class="lighthouse-stats-divider"></div>

      <div class="lighthouse-stat-group">
        <div class="lighthouse-stat-label">Today</div>
        <div class="lighthouse-stat-value lighthouse-stat-value-accent">
          +{formatNumber(todayWordCount)}
        </div>
        <div class="lighthouse-stat-sublabel">words written</div>
      </div>

      <div class="lighthouse-stat-group">
        <div class="lighthouse-stat-label">This Session</div>
        <div class="lighthouse-stat-value lighthouse-stat-value-accent">
          +{formatNumber(sessionWordCount)}
        </div>
        <div class="lighthouse-stat-sublabel">words written</div>
      </div>
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
  }

  .lighthouse-stat-value-primary {
    font-size: 2em;
    color: var(--text-accent);
  }

  .lighthouse-stat-value-accent {
    color: var(--text-accent);
  }

  .lighthouse-stat-sublabel {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
  }

  .lighthouse-stats-divider {
    height: 1px;
    background: var(--background-modifier-border);
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
    background: var(--text-accent);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
</style>
