<script lang="ts">
  import { activeProject, projects } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import { ProjectModal } from '@/ui/modals/ProjectModal'

  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  let projectStats = $state<{
    totalFiles: number
    totalWords: number
    contentFolders: number
    sourceFolders: number
  }>({
    totalFiles: 0,
    totalWords: 0,
    contentFolders: 0,
    sourceFolders: 0,
  })

  let allProjects = $derived(projects ? $projects : [])
  let currentProject = $derived($activeProject)

  // Update stats when project changes
  $effect(() => {
    if (plugin && currentProject) {
      updateProjectStats(currentProject)
    }
  })

  async function updateProjectStats(project: Project) {
    if (!plugin) {
      console.error('Lighthouse Dashboard: plugin is undefined')
      return
    }

    try {
      const result = await plugin.hierarchicalCounter.countProject(project)
      projectStats = {
        totalFiles: result.totalFiles,
        totalWords: result.totalWords,
        contentFolders: project.contentFolders.length,
        sourceFolders: project.sourceFolders.length,
      }
    } catch (error) {
      console.error('Lighthouse Dashboard: Error updating stats:', error)
    }
  }

  async function switchProject(projectId: string) {
    await plugin.projectManager.setActiveProject(projectId)
  }

  function createNewProject() {
    const modal = new ProjectModal(plugin, 'create')
    modal.open()
  }

  function editProject() {
    if (!currentProject) return
    const modal = new ProjectModal(plugin, 'edit', currentProject)
    modal.open()
  }

  async function deleteProject() {
    if (!currentProject) return

    // eslint-disable-next-line no-undef
    const confirmed = confirm(
      `Are you sure you want to delete the project "${currentProject.name}"?\n\n` +
        `This will only remove the project configuration. Your files will not be deleted.`,
    )

    if (!confirmed) return

    try {
      await plugin.projectManager.deleteProject(currentProject.id)
      // Success - the store will update automatically and UI will react
    } catch (error) {
      console.error('Error deleting project:', error)
      // eslint-disable-next-line no-undef
      alert('Failed to delete project. See console for details.')
    }
  }

  function formatNumber(num: number | undefined): string {
    if (num === undefined || num === null) {
      return '0'
    }
    return num.toLocaleString()
  }

  function getProgressPercent(): number {
    if (!currentProject?.wordCountGoal || projectStats.totalWords === 0) {
      return 0
    }
    return Math.min((projectStats.totalWords / currentProject.wordCountGoal) * 100, 100)
  }
</script>

<div class="lighthouse-dashboard">
  <div class="lighthouse-dashboard-header">
    <h2>Project Dashboard</h2>
  </div>

  <!-- Project Switcher -->
  <div class="lighthouse-dashboard-section">
    <div class="lighthouse-dashboard-section-header">
      <h3>Active Project</h3>
      {#if allProjects.length > 0}
        <button class="lighthouse-button lighthouse-button-small" onclick={createNewProject}>
          + New
        </button>
      {/if}
    </div>

    {#if allProjects.length === 0}
      <div class="lighthouse-dashboard-empty">
        <p>No projects yet</p>
        <button class="lighthouse-button lighthouse-button-primary" onclick={createNewProject}>
          Create Your First Project
        </button>
      </div>
    {:else}
      <div class="lighthouse-project-selector">
        <select
          class="lighthouse-select"
          value={currentProject?.id || ''}
          onchange={(e) => switchProject(e.currentTarget.value)}
        >
          <option value="">Select a project...</option>
          {#each allProjects as project (project.id)}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if currentProject}
    <!-- Project Stats -->
    <div class="lighthouse-dashboard-section">
      <div class="lighthouse-dashboard-section-header">
        <h3>Statistics</h3>
      </div>

      <div class="lighthouse-stats-grid">
        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">{formatNumber(projectStats.totalWords)}</div>
          <div class="lighthouse-stat-card-label">Total Words</div>
        </div>

        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">{formatNumber(projectStats.totalFiles)}</div>
          <div class="lighthouse-stat-card-label">Files</div>
        </div>

        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">{projectStats.contentFolders}</div>
          <div class="lighthouse-stat-card-label">Content Folders</div>
        </div>

        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">{projectStats.sourceFolders}</div>
          <div class="lighthouse-stat-card-label">Source Folders</div>
        </div>
      </div>

      {#if currentProject.wordCountGoal}
        <div class="lighthouse-goal-section">
          <div class="lighthouse-goal-header">
            <span class="lighthouse-goal-label">Goal Progress</span>
            <span class="lighthouse-goal-percent">{Math.round(getProgressPercent())}%</span>
          </div>
          <div class="lighthouse-progress-bar lighthouse-progress-bar-large">
            <div class="lighthouse-progress-fill" style="width: {getProgressPercent()}%"></div>
          </div>
          <div class="lighthouse-goal-details">
            {formatNumber(projectStats.totalWords)} / {formatNumber(currentProject.wordCountGoal)} words
          </div>
        </div>
      {/if}
    </div>

    <!-- Project Info -->
    <div class="lighthouse-dashboard-section">
      <div class="lighthouse-dashboard-section-header">
        <h3>Project Info</h3>
      </div>

      <div class="lighthouse-info-list">
        <div class="lighthouse-info-item">
          <span class="lighthouse-info-label">Root Path:</span>
          <span class="lighthouse-info-value">{currentProject.rootPath}</span>
        </div>

        {#if currentProject.wordCountGoal}
          <div class="lighthouse-info-item">
            <span class="lighthouse-info-label">Word Goal:</span>
            <span class="lighthouse-info-value">{formatNumber(currentProject.wordCountGoal)}</span>
          </div>
        {/if}

        <div class="lighthouse-info-item">
          <span class="lighthouse-info-label">Created:</span>
          <span class="lighthouse-info-value">
            {new Date(currentProject.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="lighthouse-dashboard-section">
      <div class="lighthouse-dashboard-section-header">
        <h3>Quick Actions</h3>
      </div>

      <div class="lighthouse-actions">
        <button
          class="lighthouse-button lighthouse-button-full"
          onclick={() => plugin.activateProjectExplorer()}
        >
          🗂️ Open File Explorer
        </button>
        <button
          class="lighthouse-button lighthouse-button-full"
          onclick={() => plugin.activateStatsPanel()}
        >
          📊 Open Writing Stats
        </button>
      </div>
    </div>

    <!-- Project Management -->
    <div class="lighthouse-dashboard-section">
      <div class="lighthouse-dashboard-section-header">
        <h3>Project Management</h3>
      </div>

      <div class="lighthouse-actions">
        <button class="lighthouse-button lighthouse-button-full" onclick={editProject}>
          ✏️ Edit Project
        </button>
        <button
          class="lighthouse-button lighthouse-button-full lighthouse-button-danger"
          onclick={deleteProject}
        >
          🗑️ Delete Project
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .lighthouse-dashboard {
    height: 100%;
    overflow-y: auto;
    padding: var(--size-4-4);
  }

  .lighthouse-dashboard-header {
    margin-bottom: var(--size-4-6);
  }

  .lighthouse-dashboard-header h2 {
    margin: 0;
    font-size: var(--font-ui-large);
    font-weight: 600;
  }

  .lighthouse-dashboard-section {
    margin-bottom: var(--size-4-6);
  }

  .lighthouse-dashboard-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--size-4-3);
  }

  .lighthouse-dashboard-section-header h3 {
    margin: 0;
    font-size: var(--font-ui-medium);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lighthouse-dashboard-empty {
    text-align: center;
    padding: var(--size-4-8);
    color: var(--text-muted);
  }

  .lighthouse-dashboard-empty p {
    margin: 0 0 var(--size-4-4) 0;
    font-size: var(--font-ui-medium);
  }

  .lighthouse-button {
    padding: var(--size-4-2) var(--size-4-4);
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-normal);
    border-radius: var(--radius-s);
    cursor: pointer;
    font-size: var(--font-ui-small);
    font-weight: 500;
  }

  .lighthouse-button:hover {
    background: var(--background-modifier-hover);
  }

  .lighthouse-button-small {
    padding: var(--size-2-2) var(--size-4-2);
    font-size: var(--font-ui-smaller);
  }

  .lighthouse-button-primary {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
  }

  .lighthouse-button-primary:hover {
    background: var(--interactive-accent-hover);
  }

  .lighthouse-button-full {
    width: 100%;
    text-align: left;
    margin-bottom: var(--size-2-2);
  }

  .lighthouse-button-danger {
    color: var(--text-error);
    border-color: var(--background-modifier-error);
  }

  .lighthouse-button-danger:hover {
    background: var(--background-modifier-error);
    color: var(--text-on-accent);
  }

  .lighthouse-project-selector {
    margin-bottom: var(--size-4-2);
  }

  .lighthouse-select {
    width: 100%;
    padding: var(--size-4-2);
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-normal);
    border-radius: var(--radius-s);
    font-size: var(--font-ui-small);
  }

  .lighthouse-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--size-4-3);
    margin-bottom: var(--size-4-4);
  }

  .lighthouse-stat-card {
    padding: var(--size-4-4);
    background: var(--background-secondary);
    border-radius: var(--radius-m);
    text-align: center;
  }

  .lighthouse-stat-card-value {
    font-size: var(--font-ui-larger);
    font-weight: 600;
    color: var(--text-accent);
    margin-bottom: var(--size-2-2);
  }

  .lighthouse-stat-card-label {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lighthouse-goal-section {
    padding: var(--size-4-4);
    background: var(--background-secondary);
    border-radius: var(--radius-m);
  }

  .lighthouse-goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--size-2-2);
  }

  .lighthouse-goal-label {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .lighthouse-goal-percent {
    font-size: var(--font-ui-medium);
    font-weight: 600;
    color: var(--text-accent);
  }

  .lighthouse-progress-bar {
    width: 100%;
    height: 8px;
    background: var(--background-modifier-border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: var(--size-2-2);
  }

  .lighthouse-progress-bar-large {
    height: 12px;
  }

  .lighthouse-progress-fill {
    height: 100%;
    background: var(--text-accent);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .lighthouse-goal-details {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-align: center;
  }

  .lighthouse-info-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-2-3);
  }

  .lighthouse-info-item {
    display: flex;
    justify-content: space-between;
    padding: var(--size-2-2);
    background: var(--background-secondary);
    border-radius: var(--radius-s);
  }

  .lighthouse-info-label {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    font-weight: 500;
  }

  .lighthouse-info-value {
    font-size: var(--font-ui-small);
    color: var(--text-normal);
  }

  .lighthouse-actions {
    display: flex;
    flex-direction: column;
  }
</style>
