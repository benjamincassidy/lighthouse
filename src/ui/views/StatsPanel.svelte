<script lang="ts">
  import { onMount } from 'svelte'

  import { activeProject } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'

  import type { TFile } from 'obsidian'

  export let plugin: LighthousePlugin

  let currentFile: TFile | null = null
  let fileWordCount = 0
  let folderWordCount = 0
  let projectWordCount = 0
  let projectGoal: number | undefined = undefined
  let sessionWordCount = 0
  let todayWordCount = 0

  let project: Project | undefined = undefined
  let updateDebounceTimer: number | null = null

  // Baseline word counts for session and today tracking
  let sessionStartWordCount = 0
  let todayStartWordCount = 0
  let todayStartDate: string = new Date().toDateString()

  // Safely subscribe to store
  $: {
    try {
      project = $activeProject
    } catch (e) {
      console.error('Lighthouse StatsPanel: Error accessing activeProject store:', e)
      project = undefined
    }
  }
  $: projectGoal = project?.wordCountGoal

  // Calculate progress percentage
  $: progressPercent =
    projectGoal && projectWordCount > 0 ? Math.min((projectWordCount / projectGoal) * 100, 100) : 0

  // Update stats when active file changes
  async function updateStats() {
    console.log('Lighthouse StatsPanel: updateStats called, project:', project?.name)

    const activeFile = plugin.app.workspace.getActiveFile()
    console.log('Lighthouse StatsPanel: Active file:', activeFile?.path)

    // Reset file/folder counts if no active markdown file
    if (!activeFile || activeFile.extension !== 'md') {
      currentFile = null
      fileWordCount = 0
      folderWordCount = 0
      console.log('Lighthouse StatsPanel: No active markdown file')
      // Don't return - still calculate project word count below
    } else {
      currentFile = activeFile

      // Get file word count
      const fileResult = await plugin.hierarchicalCounter.countFile(activeFile)
      fileWordCount = fileResult?.words || 0
      console.log('Lighthouse StatsPanel: File word count:', fileWordCount)

      // Get folder word count - count the entire folder, not filtered by project
      const folder = activeFile.parent
      if (folder) {
        const folderResult = await plugin.hierarchicalCounter.countFolder(folder.path)
        folderWordCount = folderResult?.wordCount || 0
        console.log(
          'Lighthouse StatsPanel: Folder word count:',
          folderWordCount,
          'folder:',
          folder.path,
        )
      } else {
        folderWordCount = 0
        console.log('Lighthouse StatsPanel: No folder for folder count')
      }
    }

    // Always get project word count if we have a project
    if (project) {
      const projectResult = await plugin.hierarchicalCounter.countProject(project)
      projectWordCount = projectResult.totalWords
      console.log('Lighthouse StatsPanel: Project word count:', projectWordCount)

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
      console.log('Lighthouse StatsPanel: New day detected, resetting today baseline')
      todayStartDate = currentDate
      todayStartWordCount = projectWordCount
      // Also reset session on new day
      sessionStartWordCount = projectWordCount
    }

    // Calculate deltas
    sessionWordCount = Math.max(0, projectWordCount - sessionStartWordCount)
    todayWordCount = Math.max(0, projectWordCount - todayStartWordCount)

    console.log(
      'Lighthouse StatsPanel: Session words:',
      sessionWordCount,
      'Today words:',
      todayWordCount,
    )
  }

  // Debounced update for editor changes (typing)
  function debouncedUpdate() {
    if (updateDebounceTimer !== null) {
      // eslint-disable-next-line no-undef
      window.clearTimeout(updateDebounceTimer)
    }
    // eslint-disable-next-line no-undef
    updateDebounceTimer = window.setTimeout(() => {
      console.log('Lighthouse StatsPanel: Debounced update triggered, clearing caches')
      // Clear caches so we get fresh counts
      plugin.hierarchicalCounter.clearAllCaches()
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

    console.log('Lighthouse StatsPanel: Mounted with project:', project?.name)

    const workspace = plugin.app.workspace

    // Update when active leaf changes
    plugin.registerEvent(
      workspace.on('active-leaf-change', () => {
        console.log('Lighthouse StatsPanel: Active leaf changed, clearing caches')
        plugin.hierarchicalCounter.clearAllCaches()
        updateStats()
      }),
    )

    // Update when file is opened
    plugin.registerEvent(
      workspace.on('file-open', () => {
        console.log('Lighthouse StatsPanel: File opened, clearing caches')
        plugin.hierarchicalCounter.clearAllCaches()
        updateStats()
      }),
    )

    // Update when file is modified
    plugin.registerEvent(
      workspace.on('editor-change', () => {
        console.log('Lighthouse StatsPanel: Editor changed')
        debouncedUpdate() // Use debounced version for typing
      }),
    )

    // Initial update - wait a tick for stores and workspace to be ready
    // eslint-disable-next-line no-undef
    setTimeout(async () => {
      console.log('Lighthouse StatsPanel: Initial update, project:', project?.name)
      await updateStats()
      // Set baseline for session and today after initial load
      if (project) {
        sessionStartWordCount = projectWordCount
        todayStartWordCount = projectWordCount
        console.log(
          'Lighthouse StatsPanel: Set baselines - session:',
          sessionStartWordCount,
          'today:',
          todayStartWordCount,
        )
      }
    }, 100)

    // Also trigger update after a longer delay to catch late-loading files
    // eslint-disable-next-line no-undef
    setTimeout(() => {
      console.log('Lighthouse StatsPanel: Delayed update check')
      updateStats()
    }, 500)
  })

  // Update when project changes
  $: if (plugin && project) {
    console.log('Lighthouse StatsPanel: Project changed to:', project.name)
    updateStats()
  }

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
    <div class="lighthouse-stats-empty">
      <p>No active project</p>
      <p class="lighthouse-stats-hint">Select a project to see stats</p>
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

  .lighthouse-stats-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-muted);
  }

  .lighthouse-stats-empty p {
    margin: 0;
  }

  .lighthouse-stats-hint {
    font-size: var(--font-ui-small);
    margin-top: var(--size-2-2);
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
