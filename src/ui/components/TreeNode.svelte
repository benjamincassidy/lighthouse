<script lang="ts">
  import { getStatusColor } from '@/utils/fileStatus'

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
    activeFilePath?: string | null
    folderGoals?: Record<string, number>
    folderWordCounts?: Map<string, number>
    fileGoals?: Record<string, number>
    fileWordCounts?: Map<string, number>
    ontoggle?: (_event: CustomEvent<{ path: string }>) => void
    onopen?: (_event: CustomEvent<{ path: string }>) => void
    onfilemenu?: (_event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>) => void
    oncreatenote?: (_event: CustomEvent<{ path: string }>) => void
    onreorder?: (_event: CustomEvent<ReorderDetail>) => void
  }

  let {
    node,
    depth = 0,
    activeFilePath = null,
    folderGoals,
    folderWordCounts,
    fileGoals,
    fileWordCounts,
    ontoggle,
    onopen,
    onfilemenu,
    oncreatenote,
    onreorder,
  }: Props = $props()

  let isActive = $derived(node.type === 'file' && node.path === activeFilePath)

  // Drop indicator: show a line above ('before') or below ('after') this node
  let dropIndicator = $state<'before' | 'after' | null>(null)

  function handleClick() {
    if (node.type === 'folder' && ontoggle) {
      ontoggle(new CustomEvent('toggle', { detail: { path: node.path } }))
    } else if (node.type === 'file' && onopen) {
      onopen(new CustomEvent('open', { detail: { path: node.path } }))
    }
  }

  function handleKeydown(_event: { key: string }) {
    if (_event.key === 'Enter' || _event.key === ' ') {
      handleClick()
    }
  }

  function handleContextMenu(_event: globalThis.MouseEvent) {
    _event.preventDefault()
    _event.stopPropagation()
    if (onfilemenu) {
      onfilemenu(
        new CustomEvent('contextmenu', {
          detail: { path: node.path, mouseEvent: _event },
        }),
      )
    }
  }

  let paddingLeft = $derived(`${depth}px`)

  function handleCreateNote(e: globalThis.MouseEvent) {
    e.stopPropagation()
    if (oncreatenote) {
      oncreatenote(new CustomEvent('createnote', { detail: { path: node.path } }))
    }
  }

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  function handleDragStart(e: globalThis.DragEvent) {
    // Don't initiate a drag when the pointer is over a button (e.g. create-note)
    const target = e.target as globalThis.HTMLElement | null
    if (target?.closest('button') !== null) {
      e.preventDefault()
      return
    }
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

<div class="tree-item lh-drag-host" style="padding-left: {paddingLeft}">
  {#if dropIndicator === 'before'}
    <div class="lh-drop-line lh-drop-line-before"></div>
  {/if}
  <div
    class="tree-item-self is-clickable"
    class:is-active={isActive}
    role="button"
    tabindex="0"
    draggable="true"
    onclick={handleClick}
    onkeydown={handleKeydown}
    oncontextmenu={handleContextMenu}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
  >
    {#if node.type === 'folder'}
      <div class="tree-item-icon collapse-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="svg-icon right-triangle"
          class:is-collapsed={!node.isExpanded}
        >
          <path d="M3 8L12 17L21 8" />
        </svg>
      </div>
      <div class="tree-item-inner">{node.name}</div>
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
      <button
        class="lh-tree-create-note"
        onclick={handleCreateNote}
        aria-label="New note in folder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
        >
      </button>
    {:else}
      <!-- file -->
      <div class="tree-item-icon collapse-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="0"
          class="svg-icon"
        ></svg>
      </div>
      {#if getStatusColor(node.status)}
        <span
          class="lh-status-dot"
          style="background-color: {getStatusColor(node.status)}"
          aria-label="Status: {node.status}"
        ></span>
      {/if}
      <div class="tree-item-inner">{node.name.replace(/\.md$/, '')}</div>
      {#if fileGoals?.[node.path]}
        {@const goal = fileGoals[node.path]}
        {@const wordCount = fileWordCounts?.get(node.path) ?? 0}
        {@const r = 7}
        {@const circ = 2 * Math.PI * r}
        {@const offset = circ * (1 - Math.min(wordCount / goal, 1))}
        <svg
          class="lh-file-goal-ring"
          width="16"
          height="16"
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
            stroke-width="3"
          />
          <circle
            cx="12"
            cy="12"
            {r}
            fill="none"
            stroke="var(--lh-accent, #E8A430)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray={circ}
            stroke-dashoffset={offset}
            transform="rotate(-90 12 12)"
          />
        </svg>
      {/if}
    {/if}
  </div>

  {#if dropIndicator === 'after'}
    <div class="lh-drop-line lh-drop-line-after"></div>
  {/if}

  {#if node.type === 'folder' && node.isExpanded && node.children}
    <div class="tree-item-children">
      {#each node.children as child (child.path)}
        <TreeNode
          node={child}
          depth={depth + 1}
          {activeFilePath}
          {folderGoals}
          {folderWordCounts}
          {fileGoals}
          {fileWordCounts}
          {ontoggle}
          {onopen}
          {onfilemenu}
          {oncreatenote}
          {onreorder}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .lh-tree-create-note {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    margin-left: auto;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--text-faint);
    border-radius: var(--radius-s);
    box-shadow: none;
    line-height: 0;
  }

  .lh-tree-create-note:hover {
    color: var(--text-normal);
    background: var(--background-modifier-hover);
  }

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

  .lh-folder-goal-ring {
    flex-shrink: 0;
    display: block;
    margin-left: 4px;
    opacity: 0.9;
  }

  .lh-file-goal-ring {
    flex-shrink: 0;
    display: block;
    margin-left: auto;
    opacity: 0.9;
  }
</style>
