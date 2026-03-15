<script lang="ts">
  import TreeNode from './TreeNode.svelte'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    isExpanded?: boolean
  }

  interface Props {
    node: TreeNode
    depth?: number
    activeFilePath?: string | null
    ontoggle?: (_event: CustomEvent<{ path: string }>) => void
    onopen?: (_event: CustomEvent<{ path: string }>) => void
    onfilemenu?: (_event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>) => void
    oncreatenote?: (_event: CustomEvent<{ path: string }>) => void
  }

  let {
    node,
    depth = 0,
    activeFilePath = null,
    ontoggle,
    onopen,
    onfilemenu,
    oncreatenote,
  }: Props = $props()

  let isActive = $derived(node.type === 'file' && node.path === activeFilePath)

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
</script>

<div class="tree-item" style="padding-left: {paddingLeft}">
  <div
    class="tree-item-self is-clickable"
    class:is-active={isActive}
    role="button"
    tabindex="0"
    onclick={handleClick}
    onkeydown={handleKeydown}
    oncontextmenu={handleContextMenu}
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
      <div class="tree-item-inner">{node.name.replace(/\.md$/, '')}</div>
    {/if}
  </div>

  {#if node.type === 'folder' && node.isExpanded && node.children}
    <div class="tree-item-children">
      {#each node.children as child (child.path)}
        <TreeNode
          node={child}
          depth={depth + 1}
          {activeFilePath}
          {ontoggle}
          {onopen}
          {onfilemenu}
          {oncreatenote}
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
</style>
