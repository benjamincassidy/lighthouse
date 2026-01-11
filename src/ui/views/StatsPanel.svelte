<script lang="ts">
  import { activeProject } from '@/core/stores'
  import type LighthousePlugin from '@/main'

  import type { TFile } from 'obsidian'

  export let plugin: LighthousePlugin

  let currentFile: TFile | null = null
  let fileWordCount = 0
  let folderWordCount = 0
  let projectWordCount = 0
  let projectGoal: number | undefined = undefined
  let sessionWordCount = 0
  let todayWordCount = 0

  $: project = $activeProject
  $: projectGoal = project?.wordCountGoal

  // Calculate progress percentage
  $: progressPercent =
    projectGoal && projectWordCount > 0 ? Math.min((projectWordCount / projectGoal) * 100, 100) : 0

  // Update stats when active file changes
  async function updateStats() {
    const activeFile = plugin.app.workspace.getActiveFile()

    if (!activeFile || activeFile.extension !== 'md') {
      currentFile = null
      fileWordCount = 0
      folderWordCount = 0
      return
    }

    currentFile = activeFile

    // Get file word count
    const fileResult = await plugin.hierarchicalCounter.countFile(activeFile)
    fileWordCount = fileResult?.wordCount || 0

    // Get folder word count
    const folder = activeFile.parent
    if (folder && project) {
      const folderResult = await plugin.hierarchicalCounter.countFolder(folder, project)
      folderWordCount = folderResult.totalWords
    }

    // Get project word count
    if (project) {
      const projectResult = await plugin.hierarchicalCounter.countProject(project)
      projectWordCount = projectResult.totalWords
    }
  }

  // Listen for file changes
  function setupListeners() {
    const workspace = plugin.app.workspace

    // Update when active file changes
    plugin.registerEvent(
      workspace.on('active-leaf-change', () => {
        updateStats()
      }),
    )

    // Update when file is modified
    plugin.registerEvent(
      workspace.on('editor-change', () => {
        updateStats()
      }),
    )

    // Initial update
    updateStats()
  }

  // Setup listeners when component mounts
  $: if (plugin) {
    setupListeners()
  }

  // Update stats when project changes
  $: if (project) {
    updateStats()
  }

  function formatNumber(num: number): string {
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
