<script lang="ts">
  import { activeProject, projects } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import { ProjectModal } from '@/ui/modals/ProjectModal'
  import {
    computeStreak,
    daysRemaining,
    heatmapDateKeys,
    requiredDaily,
  } from '@/utils/deadlineUtils'

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

  // --- Writing heatmap ---
  // Build 91 days (13 weeks) of daily writing data, newest on the right.
  // Each cell: { date, level 0-4 }
  interface HeatCell {
    date: string
    words: number
    level: number // 0 = no writing, 1-4 = intensity
  }

  function buildHeatmap(project: Project | undefined): HeatCell[][] {
    const WEEKS = 13

    // Determine daily target for level calculation.
    // Priority: explicit dailyGoal > computed pace from deadline > raw thresholds
    let dailyTarget = project?.dailyGoal ?? 0
    if (!dailyTarget && project?.deadline && project.wordCountGoal) {
      const left = Math.max(0, project.wordCountGoal - projectStats.totalWords)
      const rem = daysRemaining(project.deadline)
      dailyTarget = requiredDaily(left, rem)
    }

    const counts = project?.dailyWordCounts ?? {}

    // Build a flat array of cells, oldest → today (local dates)
    const dateKeys = heatmapDateKeys(WEEKS)
    const cells: HeatCell[] = dateKeys.map((dateKey) => {
      const words = counts[dateKey] ?? 0
      let level = 0
      if (words > 0) {
        if (dailyTarget > 0) {
          const pct = words / dailyTarget
          if (pct >= 1) level = 4
          else if (pct >= 0.75) level = 3
          else if (pct >= 0.4) level = 2
          else level = 1
        } else {
          // No target — intensity by raw word count
          if (words >= 1000) level = 4
          else if (words >= 500) level = 3
          else if (words >= 250) level = 2
          else level = 1
        }
      }
      return { date: dateKey, words, level }
    })

    // Chunk into weeks (columns)
    const weeks: HeatCell[][] = []
    for (let w = 0; w < WEEKS; w++) {
      weeks.push(cells.slice(w * 7, w * 7 + 7))
    }
    return weeks
  }

  let heatWeeks = $derived(buildHeatmap(currentProject))

  // Streak stats derived from stored daily history
  let streak = $derived(
    computeStreak(currentProject?.dailyWordCounts, currentProject?.daysOff ?? []),
  )

  // Day labels — show Mon, Wed, Fri, Sun (indices 0, 2, 4, 6)
  const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

  // Month label per week column: non-empty when the month changes relative to the previous column
  let monthLabels = $derived(
    heatWeeks.map((week, wi) => {
      const firstCell = week[0]
      if (!firstCell) return ''
      const currMonth = new Date(firstCell.date + 'T00:00:00Z').getUTCMonth()
      if (wi === 0) {
        // Always label the first column
        return new Date(firstCell.date + 'T00:00:00Z').toLocaleString('default', {
          month: 'short',
          timeZone: 'UTC',
        })
      }
      const prevFirst = heatWeeks[wi - 1][0]
      if (!prevFirst) return ''
      const prevMonth = new Date(prevFirst.date + 'T00:00:00Z').getUTCMonth()
      if (currMonth !== prevMonth) {
        return new Date(firstCell.date + 'T00:00:00Z').toLocaleString('default', {
          month: 'short',
          timeZone: 'UTC',
        })
      }
      return ''
    }),
  )

  interface HeatTooltip {
    cell: HeatCell
    // Offsets relative to the heatmap outer container (not the viewport)
    left: number
    top: number
  }
  let tooltip = $state<HeatTooltip | null>(null)
  // eslint-disable-next-line no-undef
  let heatmapOuterEl = $state<HTMLElement | null>(null)

  // eslint-disable-next-line no-undef
  function handleCellEnter(cell: HeatCell, e: MouseEvent) {
    if (!heatmapOuterEl) return
    // eslint-disable-next-line no-undef
    const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const outerRect = heatmapOuterEl.getBoundingClientRect()
    const TOOLTIP_W = 140 // matches min-width in CSS
    const cx = cellRect.left - outerRect.left + cellRect.width / 2
    // Clamp so tooltip never overflows the left or right edge of the container
    const left = Math.max(0, Math.min(cx - TOOLTIP_W / 2, outerRect.width - TOOLTIP_W))
    tooltip = {
      cell,
      left,
      top: cellRect.top - outerRect.top,
    }
  }
  function handleCellLeave() {
    tooltip = null
  }

  function formatCellDate(date: string): string {
    return new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
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
              viewBox="0 0 120 120"
              width="120"
              height="120"
              class="lighthouse-goal-ring"
              aria-hidden="true"
            >
              <circle cx="60" cy="60" r="48" class="lighthouse-ring-track" />
              <circle
                cx="60"
                cy="60"
                r="48"
                class="lighthouse-ring-fill"
                stroke-dasharray="301.59"
                stroke-dashoffset={301.59 * (1 - getProgressPercent() / 100)}
                transform="rotate(-90 60 60)"
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

    <!-- Writing heatmap -->
    <div class="lighthouse-dashboard-section">
      <div class="lighthouse-dashboard-section-header">
        <h3>Writing activity</h3>
      </div>
      <div class="lighthouse-heatmap-outer" bind:this={heatmapOuterEl}>
        <div class="lighthouse-heatmap-wrap">
          <!-- Day labels column -->
          <div class="lighthouse-heatmap-days">
            <!-- spacer for month row -->
            <div class="lighthouse-heatmap-month-spacer"></div>
            {#each DAY_LABELS as label, i (i)}
              <div class="lighthouse-heatmap-day-label">{label}</div>
            {/each}
          </div>
          <!-- Month labels + grid -->
          <div class="lighthouse-heatmap-right">
            <div class="lighthouse-heatmap-months">
              {#each monthLabels as label, wi (wi)}
                <div class="lighthouse-heatmap-month-label">{label}</div>
              {/each}
            </div>
            <div class="lighthouse-heatmap-grid">
              {#each heatWeeks as week, wi (wi)}
                <div class="lighthouse-heatmap-col">
                  {#each week as cell (cell.date)}
                    <div
                      class="lighthouse-heatmap-slot"
                      role="img"
                      aria-label={cell.words > 0
                        ? `${formatCellDate(cell.date)}: ${cell.words.toLocaleString()} words`
                        : formatCellDate(cell.date)}
                      onmouseenter={(e) => handleCellEnter(cell, e)}
                      onmouseleave={handleCellLeave}
                    >
                      <div class="lighthouse-heatmap-circle lh-heat-{cell.level}"></div>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        </div>
        {#if tooltip}
          <div
            class="lh-heatmap-tooltip"
            style="left: {tooltip.left}px; top: {tooltip.top}px; transform: translateY(calc(-100% - 6px))"
            aria-hidden="true"
          >
            <div class="lh-tooltip-date">{formatCellDate(tooltip.cell.date)}</div>
            <div class="lh-tooltip-words">
              {tooltip.cell.words > 0
                ? `${tooltip.cell.words.toLocaleString()} words`
                : 'No writing'}
            </div>
          </div>
        {/if}
      </div>
      <div class="lighthouse-heatmap-legend">
        <span class="lighthouse-heatmap-legend-label">Less</span>
        {#each [0, 1, 2, 3, 4] as lvl (lvl)}
          <div class="lighthouse-heatmap-slot">
            <div class="lighthouse-heatmap-circle lh-heat-{lvl}"></div>
          </div>
        {/each}
        <span class="lighthouse-heatmap-legend-label">More</span>
      </div>

      <!-- Streak stats -->
      {#if streak.current > 0 || streak.longest > 0}
        <div class="lighthouse-streak-stats">
          <div class="lighthouse-streak-card">
            <div class="lighthouse-streak-card-value">{streak.current}</div>
            <div class="lighthouse-streak-card-label">day streak</div>
          </div>
          {#if streak.longest > 0}
            <div class="lighthouse-streak-card">
              <div class="lighthouse-streak-card-value lighthouse-streak-card-value-muted">
                {streak.longest}
              </div>
              <div class="lighthouse-streak-card-label">personal best</div>
            </div>
          {/if}
        </div>
      {/if}
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
    color: var(--lh-accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    stroke: var(--lh-accent);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset var(--lh-ring-transition);
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
    font-variant-numeric: tabular-nums;
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
    color: var(--lh-accent);
    margin-bottom: 2px;
    font-variant-numeric: tabular-nums;
  }

  .lighthouse-stat-card-label {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Writing heatmap */
  .lighthouse-heatmap-outer {
    position: relative;
    overflow: visible;
  }

  .lighthouse-heatmap-wrap {
    display: flex;
    gap: 6px;
    overflow-x: auto;
  }

  .lighthouse-heatmap-days {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-shrink: 0;
  }

  .lighthouse-heatmap-month-spacer {
    height: 14px; /* matches month label row height */
  }

  .lighthouse-heatmap-day-label {
    width: 10px;
    height: 15px;
    font-size: 9px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
  }

  .lighthouse-heatmap-right {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .lighthouse-heatmap-months {
    display: flex;
    gap: 3px;
    height: 14px;
  }

  .lighthouse-heatmap-month-label {
    width: 13px;
    font-size: 9px;
    color: var(--text-muted);
    overflow: visible;
    white-space: nowrap;
    line-height: 14px;
    flex-shrink: 0;
  }

  .lighthouse-heatmap-grid {
    display: flex;
    gap: 3px;
  }

  .lighthouse-heatmap-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  /* Fixed-size slot — circles grow inside this via lh-heat-N classes */
  .lighthouse-heatmap-slot {
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: default;
  }

  .lighthouse-heatmap-circle {
    border-radius: 50%;
    flex-shrink: 0;
    transition:
      width 0.15s ease,
      height 0.15s ease;
  }

  /* Remove the old .lighthouse-heatmap-cell square rule */

  .lh-heat-0 {
    width: 5px;
    height: 5px;
    background: color-mix(in srgb, var(--text-muted) 55%, transparent);
  }

  .lh-heat-1 {
    width: 8px;
    height: 8px;
    background: color-mix(in srgb, var(--lh-accent) 35%, transparent);
  }

  .lh-heat-2 {
    width: 11px;
    height: 11px;
    background: color-mix(in srgb, var(--lh-accent) 58%, transparent);
  }

  .lh-heat-3 {
    width: 13px;
    height: 13px;
    background: color-mix(in srgb, var(--lh-accent) 80%, transparent);
  }

  .lh-heat-4 {
    width: 15px;
    height: 15px;
    background: var(--lh-accent);
  }

  .lighthouse-heatmap-legend {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: var(--size-4-2);
    justify-content: flex-end;
  }

  .lighthouse-heatmap-legend-label {
    font-size: var(--font-ui-smaller);
    color: var(--text-faint);
    margin: 0 2px;
  }

  /* Tooltip — absolute within the heatmap-wrap container */
  .lh-heatmap-tooltip {
    position: absolute;
    z-index: 100;
    pointer-events: none;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    padding: 5px 9px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 140px;
    white-space: nowrap;
  }

  .lh-tooltip-date {
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-normal);
    margin-bottom: 2px;
  }

  .lh-tooltip-words {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
  }

  .lighthouse-streak-stats {
    display: flex;
    gap: var(--size-4-4);
    margin-top: var(--size-4-3);
  }

  .lighthouse-streak-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lighthouse-streak-card-value {
    font-size: var(--font-ui-larger);
    font-weight: 600;
    color: var(--lh-accent);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .lighthouse-streak-card-value-muted {
    color: var(--text-muted);
  }

  .lighthouse-streak-card-label {
    font-size: var(--font-ui-smaller);
    color: var(--text-faint);
  }
</style>
