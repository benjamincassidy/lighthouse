<script lang="ts">
  import { getStatusColor } from '@/utils/fileStatus'

  interface ReorderDetail {
    draggedPath: string
    targetPath: string
    position: 'before' | 'after'
  }

  interface Props {
    path: string
    filename: string
    title: string
    preview?: string
    status?: string
    goal?: number
    wordCount?: number
    isActive?: boolean
    onopen?: (_event: CustomEvent<{ path: string }>) => void
    onmenu?: (_event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>) => void
    onreorder?: (_event: CustomEvent<ReorderDetail>) => void
  }

  let {
    path,
    filename,
    title,
    preview = '',
    status,
    goal,
    wordCount = 0,
    isActive = false,
    onopen,
    onmenu,
    onreorder,
  }: Props = $props()

  let statusColor = $derived(getStatusColor(status))

  // Drop indicator: show a line above ('before') or below ('after') this card
  let dropIndicator = $state<'before' | 'after' | null>(null)

  function handleOpen() {
    if (onopen) {
      onopen(new CustomEvent('open', { detail: { path } }))
    }
  }

  function handleKeydown(_event: { key: string }) {
    if (_event.key === 'Enter' || _event.key === ' ') {
      handleOpen()
    }
  }

  function handleContextMenu(_event: globalThis.MouseEvent) {
    _event.preventDefault()
    _event.stopPropagation()
    if (onmenu) {
      onmenu(new CustomEvent('contextmenu', { detail: { path, mouseEvent: _event } }))
    }
  }

  function handleDragStart(e: globalThis.DragEvent) {
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('lighthouse/path', path)
    }
  }

  function handleDragOver(e: globalThis.DragEvent) {
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
    if (draggedPath && draggedPath !== path && onreorder) {
      onreorder(
        new CustomEvent('reorder', {
          detail: { draggedPath, targetPath: path, position: dropIndicator ?? 'after' },
        }),
      )
    }
    dropIndicator = null
  }

  function handleDragEnd() {
    dropIndicator = null
  }
</script>

<div class="lh-sheet-card-host lh-drag-host">
  {#if dropIndicator === 'before'}
    <div class="lh-drop-line lh-drop-line-before"></div>
  {/if}
  <div
    class="lh-sheet-card"
    class:is-active={isActive}
    role="button"
    tabindex="0"
    draggable="true"
    title={filename}
    onclick={handleOpen}
    onkeydown={handleKeydown}
    oncontextmenu={handleContextMenu}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
  >
    <div class="lh-sheet-card-header">
      {#if statusColor}
        <span
          class="lh-status-dot"
          style="background-color: {statusColor}"
          aria-label="Status: {status}"
        ></span>
      {/if}
      <div class="lh-sheet-card-title">{title}</div>
      {#if goal}
        {@const r = 7}
        {@const circ = 2 * Math.PI * r}
        {@const offset = circ * (1 - Math.min(wordCount / goal, 1))}
        <svg
          class="lh-file-goal-ring"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-label="{wordCount} / {goal} words"
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
    </div>
    <div class="lh-sheet-card-preview">{preview}</div>
  </div>
  {#if dropIndicator === 'after'}
    <div class="lh-drop-line lh-drop-line-after"></div>
  {/if}
</div>

<style>
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

  .lh-sheet-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    margin: 3px 6px;
    border-radius: var(--radius-m);
    cursor: pointer;
  }

  .lh-sheet-card:hover {
    background: var(--background-modifier-hover);
  }

  .lh-sheet-card.is-active {
    background: var(--background-modifier-active-hover);
  }

  .lh-sheet-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .lh-sheet-card-title {
    flex: 1;
    min-width: 0;
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lh-file-goal-ring {
    flex-shrink: 0;
    display: block;
    opacity: 0.9;
  }

  /* Fixed to exactly 3 lines regardless of actual preview length, so every
     card in the Sheet List reserves the same height — matches Ulysses'
     uniform card sizing instead of shrinking to fit shorter previews. */
  .lh-sheet-card-preview {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    line-height: 1.4;
    min-height: calc(1.4em * 3);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
