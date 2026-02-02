<script lang="ts">
  import TreeNode from './TreeNode.svelte'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    wordCount?: number
    isExpanded?: boolean
  }

  interface Props {
    node: TreeNode
    depth?: number
    activeFilePath?: string | null
    ontoggle?: (_event: CustomEvent<{ path: string }>) => void
    onopen?: (_event: CustomEvent<{ path: string }>) => void
    oncontextmenu?: (
      _event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>,
    ) => void
  }

  let { node, depth = 0, activeFilePath = null, ontoggle, onopen, oncontextmenu }: Props = $props()

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
    if (oncontextmenu) {
      oncontextmenu(
        new CustomEvent('contextmenu', {
          detail: { path: node.path, mouseEvent: _event },
        }),
      )
    }
  }

  let paddingLeft = $derived(`${depth}px`)
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
          class:is-collapsed={node.isExpanded}
        >
          <path d="M3 8L12 17L21 8" />
        </svg>
      </div>
      <div class="tree-item-inner">{node.name}</div>
    {:else}
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
      <div class="tree-item-inner">{node.name}</div>
    {/if}

    {#if node.wordCount !== undefined}
      <div class="tree-item-flair-outer">
        <span class="tree-item-flair">{node.wordCount}</span>
      </div>
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
          {oncontextmenu}
        />
      {/each}
    </div>
  {/if}
</div>
