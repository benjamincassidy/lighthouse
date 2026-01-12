<script lang="ts">
  import TreeNode from './TreeNode.svelte'

  import type { TFile } from 'obsidian'

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
    ontoggle?: (e: CustomEvent<{ path: string }>) => void
    onopen?: (e: CustomEvent<{ path: string }>) => void
  }

  let { node, depth = 0, ontoggle, onopen }: Props = $props()

  function handleClick() {
    if (node.type === 'folder' && ontoggle) {
      ontoggle(new CustomEvent('toggle', { detail: { path: node.path } }))
    } else if (node.type === 'file' && onopen) {
      onopen(new CustomEvent('open', { detail: { path: node.path } }))
    }
  }

  let paddingLeft = $derived(`${depth * 20 + 8}px`)
</script>

<div class="lighthouse-tree-node" style="padding-left: {paddingLeft}">
  <div
    class="lighthouse-tree-node-content"
    role="button"
    tabindex="0"
    onclick={handleClick}
    onkeydown={handleClick}
  >
    {#if node.type === 'folder'}
      <span class="lighthouse-tree-node-icon">
        {#if node.isExpanded}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        {/if}
      </span>
      <span class="lighthouse-tree-node-name">{node.name}</span>
    {:else}
      <span class="lighthouse-tree-node-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>
      <span class="lighthouse-tree-node-name">{node.name}</span>
    {/if}

    {#if node.wordCount !== undefined}
      <span class="lighthouse-tree-node-count">{node.wordCount}</span>
    {/if}
  </div>

  {#if node.type === 'folder' && node.isExpanded && node.children}
    {#each node.children as child (child.path)}
      <TreeNode node={child} depth={depth + 1} {ontoggle} {onopen} />
    {/each}
  {/if}
</div>

<style>
  .lighthouse-tree-node {
    user-select: none;
  }

  .lighthouse-tree-node-content {
    display: flex;
    align-items: center;
    gap: var(--size-2-2);
    padding: var(--size-2-1) var(--size-2-2);
    border-radius: var(--radius-s);
    cursor: pointer;
    transition: background-color 0.1s;
  }

  .lighthouse-tree-node-content:hover {
    background-color: var(--background-modifier-hover);
  }

  .lighthouse-tree-node-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .lighthouse-tree-node-name {
    flex: 1;
    font-size: var(--font-ui-small);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lighthouse-tree-node-count {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
