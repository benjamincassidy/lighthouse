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
  <!-- Project Header -->
  <div class="lighthouse-dashboard-section">
    <div class="lighthouse-dashboard-section-header">
      <h3>Active Project</h3>
      <div class="lighthouse-header-actions">
        {#if currentProject}
          <button class="clickable-icon" onclick={editProject} aria-label="Edit project">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              /></svg
            >
          </button>
          <button
            class="clickable-icon lighthouse-danger-action"
            onclick={deleteProject}
            aria-label="Delete project"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><polyline points="3 6 5 6 21 6" /><path
                d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
              /><path d="M10 11v6" /><path d="M14 11v6" /><path
                d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
              /></svg
            >
          </button>
        {/if}
        <button class="clickable-icon" onclick={createNewProject} aria-label="New project">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
          >
        </button>
      </div>
    </div>

    {#if allProjects.length === 0}
      <div class="lighthouse-dashboard-empty">
        <p>No projects yet</p>
        <button class="mod-cta" onclick={createNewProject}>Create Your First Project</button>
      </div>
    {:else}
      <div class="lighthouse-project-selector">
        <select
          class="dropdown"
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
    <!-- Goal Ring + Stats -->
    <div class="lighthouse-dashboard-section">
      {#if currentProject.wordCountGoal}
        <div class="lighthouse-goal-ring-section">
          <div class="lighthouse-goal-ring-container">
            <svg
              viewBox="0 0 80 80"
              width="80"
              height="80"
              class="lighthouse-goal-ring"
              aria-hidden="true"
            >
              <circle cx="40" cy="40" r="32" class="lighthouse-ring-track" />
              <circle
                cx="40"
                cy="40"
                r="32"
                class="lighthouse-ring-fill"
                stroke-dasharray="201.06"
                stroke-dashoffset={201.06 * (1 - getProgressPercent() / 100)}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div class="lighthouse-ring-inner">
              <span class="lighthouse-ring-percent">{Math.round(getProgressPercent())}%</span>
            </div>
          </div>
          <div class="lighthouse-goal-text">
            <div class="lighthouse-goal-words">{formatNumber(projectStats.totalWords)}</div>
            <div class="lighthouse-goal-target">
              of {formatNumber(currentProject.wordCountGoal)} words
            </div>
            {#if projectStats.totalWords < currentProject.wordCountGoal}
              <div class="lighthouse-goal-remaining">
                {formatNumber(currentProject.wordCountGoal - projectStats.totalWords)} to go
              </div>
            {:else}
              <div class="lighthouse-goal-complete">Goal reached!</div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="lighthouse-stat-card lighthouse-stat-card-wide">
          <div class="lighthouse-stat-card-value">{formatNumber(projectStats.totalWords)}</div>
          <div class="lighthouse-stat-card-label">Total Words</div>
        </div>
      {/if}

      <div class="lighthouse-stats-grid">
        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">{formatNumber(projectStats.totalFiles)}</div>
          <div class="lighthouse-stat-card-label">Files</div>
        </div>
        <div class="lighthouse-stat-card">
          <div class="lighthouse-stat-card-value">
            {new Date(currentProject.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div class="lighthouse-stat-card-label">Started</div>
        </div>
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
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .lighthouse-header-actions {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .lighthouse-danger-action {
    color: var(--text-error);
  }

  .lighthouse-danger-action:hover {
    color: var(--text-error);
    background: var(--background-modifier-error-hover);
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

  .lighthouse-project-selector .dropdown {
    width: 100%;
  }

  /* Circular goal ring */
  .lighthouse-goal-ring-section {
    display: flex;
    align-items: center;
    gap: var(--size-4-5);
    padding: var(--size-4-4);
    background: var(--background-secondary);
    border-radius: var(--radius-m);
    margin-bottom: var(--size-4-3);
  }

  .lighthouse-goal-ring-container {
    position: relative;
    flex-shrink: 0;
  }

  .lighthouse-ring-track {
    fill: none;
    stroke: var(--background-modifier-border);
    stroke-width: 6;
  }

  .lighthouse-ring-fill {
    fill: none;
    stroke: var(--text-accent);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.4s ease;
  }

  .lighthouse-ring-inner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lighthouse-ring-percent {
    font-size: var(--font-ui-medium);
    font-weight: 700;
    color: var(--text-normal);
  }

  .lighthouse-goal-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lighthouse-goal-words {
    font-size: var(--font-ui-larger);
    font-weight: 700;
    color: var(--text-normal);
    line-height: 1.1;
  }

  .lighthouse-goal-target {
    font-size: var(--font-ui-small);
    color: var(--text-muted);
  }

  .lighthouse-goal-remaining {
    margin-top: 4px;
    font-size: var(--font-ui-smaller);
    color: var(--text-faint);
  }

  .lighthouse-goal-complete {
    margin-top: 4px;
    font-size: var(--font-ui-smaller);
    color: var(--color-green);
    font-weight: 500;
  }

  /* Stats grid */
  .lighthouse-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--size-4-3);
  }

  .lighthouse-stat-card {
    padding: var(--size-4-3) var(--size-4-4);
    background: var(--background-secondary);
    border-radius: var(--radius-m);
    text-align: center;
  }

  .lighthouse-stat-card-wide {
    grid-column: 1 / -1;
  }

  .lighthouse-stat-card-value {
    font-size: var(--font-ui-large);
    font-weight: 600;
    color: var(--text-accent);
    margin-bottom: 2px;
  }

  .lighthouse-stat-card-label {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
