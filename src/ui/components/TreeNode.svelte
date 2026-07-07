<script lang="ts">
  import { getGroupIcon } from '@/ui/icons/groupIcons'

  import TreeNode from './TreeNode.svelte'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    isExpanded?: boolean
    status?: string
  }

  interface ReorderDetail {
    draggedPath: string
    targetPath: string
    position: 'before' | 'after'
  }

  interface Props {
    node: TreeNode
    depth?: number
    selectedPath?: string | null
    folderGoals?: Record<string, number>
    folderIcons?: Record<string, string>
    folderWordCounts?: Map<string, number>
    /** Optional CSS color override for this subtree's icons/chevrons (e.g. Extras' tint). */
    iconColor?: string
    ontoggle?: (_event: CustomEvent<{ path: string }>) => void
    onselect?: (_event: CustomEvent<{ path: string }>) => void
    onfoldermenu?: (
      _event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>,
    ) => void
    onreorder?: (_event: CustomEvent<ReorderDetail>) => void
  }

  let {
    node,
    depth = 0,
    selectedPath = null,
    folderGoals,
    folderIcons,
    folderWordCounts,
    iconColor,
    ontoggle,
    onselect,
    onfoldermenu,
    onreorder,
  }: Props = $props()

  let isSelected = $derived(node.path === selectedPath)
  let groupIcon = $derived(getGroupIcon(folderIcons?.[node.path]))

  // Groups tree only ever shows subgroups — files live in the Sheet List.
  // A chevron only appears when there's actually something to expand into;
  // leaf folders have no reserved space for one (matches Ulysses: only
  // expandable groups get the extra glyph, leaves sit flush with it).
  let subgroups = $derived((node.children ?? []).filter((c) => c.type === 'folder'))
  let hasSubgroups = $derived(subgroups.length > 0)

  // Drop indicator: show a line above ('before') or below ('after') this node
  let dropIndicator = $state<'before' | 'after' | null>(null)

  function handleSelect() {
    if (onselect) {
      onselect(new CustomEvent('select', { detail: { path: node.path } }))
    }
  }

  function handleSelectKeydown(_event: { key: string }) {
    if (_event.key === 'Enter' || _event.key === ' ') {
      handleSelect()
    }
  }

  function handleToggleClick(_event: globalThis.MouseEvent) {
    _event.stopPropagation()
    if (ontoggle) {
      ontoggle(new CustomEvent('toggle', { detail: { path: node.path } }))
    }
  }

  function handleToggleKeydown(_event: { key: string }) {
    if (_event.key === 'Enter' || _event.key === ' ') {
      if (ontoggle) {
        ontoggle(new CustomEvent('toggle', { detail: { path: node.path } }))
      }
    }
  }

  function handleContextMenu(_event: globalThis.MouseEvent) {
    _event.preventDefault()
    _event.stopPropagation()
    if (onfoldermenu) {
      onfoldermenu(
        new CustomEvent('contextmenu', {
          detail: { path: node.path, mouseEvent: _event },
        }),
      )
    }
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────

  function handleDragStart(e: globalThis.DragEvent) {
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('lighthouse/path', node.path)
    }
  }

  function handleDragOver(e: globalThis.DragEvent) {
    // Only accept drops that carry a lighthouse path
    if (!e.dataTransfer?.types.includes('lighthouse/path')) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

    const el = e.currentTarget as globalThis.HTMLElement
    const rect = el.getBoundingClientRect()
    dropIndicator = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }

  function handleDragLeave() {
    dropIndicator = null
  }

  function handleDrop(e: globalThis.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const draggedPath = e.dataTransfer?.getData('lighthouse/path')
    if (draggedPath && draggedPath !== node.path && onreorder) {
      onreorder(
        new CustomEvent('reorder', {
          detail: { draggedPath, targetPath: node.path, position: dropIndicator ?? 'after' },
        }),
      )
    }
    dropIndicator = null
  }

  function handleDragEnd() {
    dropIndicator = null
  }
</script>

<div class="lh-group-node lh-drag-host">
  {#if dropIndicator === 'before'}
    <div class="lh-drop-line lh-drop-line-before"></div>
  {/if}
  <div
    class="lh-group-row"
    class:is-selected={isSelected}
    role="button"
    tabindex="0"
    draggable="true"
    onclick={handleSelect}
    onkeydown={handleSelectKeydown}
    oncontextmenu={handleContextMenu}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
  >
    {#if hasSubgroups}
      <button
        class="lh-chevron"
        style={iconColor ? `color: ${iconColor}` : undefined}
        onclick={handleToggleClick}
        onkeydown={handleToggleKeydown}
        aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lh-chevron-icon"
          class:is-collapsed={!node.isExpanded}
        >
          <path d="M3 8L12 17L21 8" />
        </svg>
      </button>
    {:else}
      <div class="lh-chevron" aria-hidden="true"></div>
    {/if}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lh-group-icon"
      style={iconColor ? `color: ${iconColor}` : undefined}
      aria-hidden="true"
    >
      {#each groupIcon.shapes as shape, i (i)}
        {#if shape.type === 'path'}
          <path d={shape.d} />
        {:else if shape.type === 'circle'}
          <circle cx={shape.cx} cy={shape.cy} r={shape.r} />
        {:else if shape.type === 'rect'}
          <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />
        {:else if shape.type === 'line'}
          <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
        {:else if shape.type === 'polygon'}
          <polygon points={shape.points} />
        {/if}
      {/each}
    </svg>
    <span class="lh-group-name">{node.name}</span>
    {#if folderGoals?.[node.path]}
      {@const goal = folderGoals[node.path]}
      {@const wordCount = folderWordCounts?.get(node.path) ?? 0}
      {@const r = 9}
      {@const circ = 2 * Math.PI * r}
      {@const offset = circ * (1 - Math.min(wordCount / goal, 1))}
      <svg
        class="lh-folder-goal-ring"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-label="{wordCount} / {goal} words"
        title="{wordCount} / {goal} words"
      >
        <circle
          cx="12"
          cy="12"
          {r}
          fill="none"
          stroke="var(--background-modifier-border)"
          stroke-width="2.5"
        />
        <circle
          cx="12"
          cy="12"
          {r}
          fill="none"
          stroke="var(--lh-accent, #E8A430)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray={circ}
          stroke-dashoffset={offset}
          transform="rotate(-90 12 12)"
        />
      </svg>
    {/if}
  </div>

  {#if dropIndicator === 'after'}
    <div class="lh-drop-line lh-drop-line-after"></div>
  {/if}

  {#if node.isExpanded && hasSubgroups}
    <div class="lh-group-children">
      {#each subgroups as child (child.path)}
        <TreeNode
          node={child}
          depth={depth + 1}
          {selectedPath}
          {folderGoals}
          {folderIcons}
          {folderWordCounts}
          {iconColor}
          {ontoggle}
          {onselect}
          {onfoldermenu}
          {onreorder}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Drag-and-drop drop indicator lines */
  .lh-drag-host {
    position: relative;
  }

  .lh-drop-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--text-accent);
    pointer-events: none;
    z-index: 10;
  }

  .lh-drop-line-before {
    top: 0;
  }

  .lh-drop-line-after {
    bottom: 0;
  }

  /* Fully self-contained row styling — no reliance on Obsidian's own
     tree-item classes, which carry ambient padding assumptions from the
     real file explorer that fought our own sizing. */
  .lh-group-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: var(--radius-s);
    cursor: pointer;
  }

  .lh-group-row:hover {
    background: var(--background-modifier-hover);
  }

  .lh-group-row.is-selected {
    background: var(--background-modifier-active-hover);
  }

  .lh-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    color: var(--text-faint);
  }

  .lh-chevron-icon {
    transition: transform 100ms ease-in-out;
  }

  .lh-chevron-icon.is-collapsed {
    transform: rotate(-90deg);
  }

  .lh-group-icon {
    flex-shrink: 0;
    color: var(--text-faint);
  }

  .lh-group-name {
    flex: 1;
    min-width: 0;
    font-size: var(--font-ui-small);
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lh-folder-goal-ring {
    flex-shrink: 0;
    display: block;
    opacity: 0.9;
  }

  .lh-group-children {
    padding-left: 14px;
  }
</style>
