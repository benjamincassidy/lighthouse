<script lang="ts">
  import { activeProject } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import TreeNodeComponent from '@/ui/components/TreeNode.svelte'

  import type { TFile, TFolder } from 'obsidian'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    wordCount?: number
    isExpanded?: boolean
  }

  export let plugin: LighthousePlugin
  export let showFullVault = false

  let treeNodes: TreeNode[] = []
  let currentProject: Project | undefined

  $: currentProject = $activeProject

  // Rebuild tree when active project or view mode changes
  $: {
    if (currentProject && !showFullVault) {
      buildProjectTree(currentProject)
    } else if (showFullVault) {
      buildFullVaultTree()
    } else {
      treeNodes = []
    }
  }

  function buildProjectTree(project: Project) {
    const vault = plugin.app.vault
    const rootFolder = vault.getAbstractFileByPath(project.rootPath)

    if (!rootFolder || !('children' in rootFolder)) {
      treeNodes = []
      return
    }

    // Get all content and source folders
    const allFolders = [...project.contentFolders, ...project.sourceFolders]
    const nodes: TreeNode[] = []

    for (const folderPath of allFolders) {
      const fullPath = plugin.folderManager.resolveProjectPath(project.rootPath, folderPath)
      const folder = vault.getAbstractFileByPath(fullPath)

      if (folder && 'children' in folder) {
        const node = buildTreeNode(folder as TFolder, project)
        if (node) {
          nodes.push(node)
        }
      }
    }

    treeNodes = nodes
  }

  function buildFullVaultTree() {
    const vault = plugin.app.vault
    const root = vault.getRoot()
    const node = buildTreeNode(root, undefined)
    treeNodes = node ? [node] : []
  }

  function buildTreeNode(folder: TFolder, project?: Project): TreeNode | null {
    const children: TreeNode[] = []

    for (const child of folder.children) {
      if ('children' in child) {
        // It's a folder
        const childNode = buildTreeNode(child as TFolder, project)
        if (childNode) {
          children.push(childNode)
        }
      } else {
        // It's a file
        const file = child as TFile
        if (file.extension === 'md') {
          children.push({
            name: file.name,
            path: file.path,
            type: 'file',
          })
        }
      }
    }

    // Sort: folders first, then files, alphabetically
    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return {
      name: folder.name || 'Root',
      path: folder.path,
      type: 'folder',
      children,
      isExpanded: true,
    }
  }

  function handleToggle(event: CustomEvent<{ path: string }>) {
    // Find and toggle the node
    const path = event.detail.path
    function toggleNodeByPath(nodes: TreeNode[]): boolean {
      for (const node of nodes) {
        if (node.path === path) {
          node.isExpanded = !node.isExpanded
          return true
        }
        if (node.children && toggleNodeByPath(node.children)) {
          return true
        }
      }
      return false
    }
    toggleNodeByPath(treeNodes)
    treeNodes = treeNodes // Trigger reactivity
  }

  async function handleOpen(event: CustomEvent<{ path: string }>) {
    const path = event.detail.path
    const file = plugin.app.vault.getAbstractFileByPath(path)
    if (file && !('children' in file)) {
      await plugin.app.workspace.getLeaf().openFile(file as TFile)
    }
  }

  function toggleViewMode() {
    showFullVault = !showFullVault
  }
</script>

<div class="lighthouse-explorer">
  <div class="lighthouse-explorer-header">
    <h3>
      {#if currentProject && !showFullVault}
        {currentProject.name}
      {:else}
        Vault Explorer
      {/if}
    </h3>
    <button
      class="clickable-icon"
      aria-label={showFullVault ? 'Show project files' : 'Show all files'}
      on:click={toggleViewMode}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {#if showFullVault}
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        {:else}
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path
            d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          />
        {/if}
      </svg>
    </button>
  </div>

  {#if !currentProject && !showFullVault}
    <div class="lighthouse-empty-state">
      <p>No active project</p>
      <p class="lighthouse-empty-state-hint">Select a project to see its files</p>
    </div>
  {:else if treeNodes.length === 0}
    <div class="lighthouse-empty-state">
      <p>No files found</p>
    </div>
  {:else}
    <div class="lighthouse-tree">
      {#each treeNodes as node (node.path)}
        <TreeNodeComponent {node} depth={0} on:toggle={handleToggle} on:open={handleOpen} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .lighthouse-explorer {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .lighthouse-explorer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--size-4-2);
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .lighthouse-explorer-header h3 {
    margin: 0;
    font-size: var(--font-ui-medium);
    font-weight: 600;
  }

  .lighthouse-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4-4);
    text-align: center;
    color: var(--text-muted);
  }

  .lighthouse-empty-state p {
    margin: 0;
  }

  .lighthouse-empty-state-hint {
    font-size: var(--font-ui-small);
    margin-top: var(--size-2-2);
  }

  .lighthouse-tree {
    flex: 1;
    overflow-y: auto;
    padding: var(--size-2-2);
  }
</style>
