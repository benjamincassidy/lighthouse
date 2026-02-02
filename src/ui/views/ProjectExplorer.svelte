<script lang="ts">
  import { Menu, type TFile, type TFolder } from 'obsidian'

  import { activeProject, projects } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import TreeNodeComponent from '@/ui/components/TreeNode.svelte'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    wordCount?: number
    isExpanded?: boolean
    folderType?: 'content' | 'source'
  }

  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  let contentNodes = $state<TreeNode[]>([])
  let sourceNodes = $state<TreeNode[]>([])
  let contentCollapsed = $state(false)
  let sourceCollapsed = $state(false)
  let currentProject = $derived(activeProject ? $activeProject : undefined)
  let allProjects = $derived(projects ? $projects : [])
  let activeFilePath = $state<string | null>(null)

  // Track active file changes
  $effect(() => {
    const updateActiveFile = () => {
      const file = plugin.app.workspace.getActiveFile()
      activeFilePath = file?.path || null
    }

    updateActiveFile()

    plugin.registerEvent(plugin.app.workspace.on('active-leaf-change', updateActiveFile))
  })

  // Rebuild tree when active project changes
  $effect(() => {
    if (!plugin) {
      contentNodes = []
      sourceNodes = []
    } else if (currentProject) {
      buildProjectTree(currentProject)
    } else {
      contentNodes = []
      sourceNodes = []
    }
  })

  function buildProjectTree(project: Project) {
    if (!plugin) {
      console.error('Lighthouse: ProjectExplorer plugin is undefined')
      contentNodes = []
      sourceNodes = []
      return
    }

    const vault = plugin.app.vault
    const rootFolder = vault.getAbstractFileByPath(project.rootPath)

    if (!rootFolder || !('children' in rootFolder)) {
      console.warn('Lighthouse: Root folder not found:', project.rootPath)
      contentNodes = []
      sourceNodes = []
      return
    }

    const content: TreeNode[] = []
    const source: TreeNode[] = []

    // Build content folder nodes
    for (const folderPath of project.contentFolders) {
      const fullPath = plugin.folderManager.resolveProjectPath(project.rootPath, folderPath)
      const folder = vault.getAbstractFileByPath(fullPath)

      if (folder && 'children' in folder) {
        const node = buildTreeNode(folder as TFolder, project, 'content')
        if (node) {
          content.push(node)
        }
      } else {
        console.warn('Lighthouse: Content folder not found:', fullPath)
      }
    }

    // Build source folder nodes
    for (const folderPath of project.sourceFolders) {
      const fullPath = plugin.folderManager.resolveProjectPath(project.rootPath, folderPath)
      const folder = vault.getAbstractFileByPath(fullPath)

      if (folder && 'children' in folder) {
        const node = buildTreeNode(folder as TFolder, project, 'source')
        if (node) {
          source.push(node)
        }
      } else {
        console.warn('Lighthouse: Source folder not found:', fullPath)
      }
    }

    contentNodes = content
    sourceNodes = source
  }

  function buildTreeNode(
    folder: TFolder,
    project?: Project,
    folderType?: 'content' | 'source',
  ): TreeNode | null {
    const children: TreeNode[] = []

    for (const child of folder.children) {
      if ('children' in child) {
        // It's a folder - inherit parent's folder type
        const childNode = buildTreeNode(child as TFolder, project, folderType)
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
            folderType,
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
      folderType,
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

    if (!toggleNodeByPath(contentNodes)) {
      toggleNodeByPath(sourceNodes)
    }

    // Trigger reactivity in Svelte 5
    contentNodes = [...contentNodes]
    sourceNodes = [...sourceNodes]
  }

  async function handleOpen(event: CustomEvent<{ path: string }>) {
    const path = event.detail.path
    const file = plugin.app.vault.getAbstractFileByPath(path)
    if (file && !('children' in file)) {
      const leaf = plugin.app.workspace.getLeaf(false)
      await leaf.openFile(file as TFile)
    }
  }

  function handleContextMenu(
    event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>,
  ) {
    const { path, mouseEvent } = event.detail
    const file = plugin.app.vault.getAbstractFileByPath(path)

    if (!file) return

    const menu = new Menu()

    // Let plugins add their menu items first
    plugin.app.workspace.trigger('file-menu', menu, file, 'file-explorer')

    // Add core file operations
    if ('children' in file) {
      // It's a folder
      menu.addItem((item) => {
        item
          .setTitle('New note')
          .setIcon('document')
          .onClick(async () => {
            const newFile = await plugin.app.vault.create(`${file.path}/Untitled.md`, '')
            const leaf = plugin.app.workspace.getLeaf(false)
            await leaf.openFile(newFile)
          })
      })

      menu.addItem((item) => {
        item
          .setTitle('New folder')
          .setIcon('folder')
          .onClick(async () => {
            await plugin.app.vault.createFolder(`${file.path}/New folder`)
          })
      })
    }

    // Rename for both files and folders
    menu.addItem((item) => {
      item
        .setTitle('Rename')
        .setIcon('pencil')
        .onClick(() => {
          // @ts-expect-error - Using internal Obsidian API
          plugin.app.fileManager.promptForFileRename(file)
        })
    })

    // Delete for both files and folders
    menu.addItem((item) => {
      item
        .setTitle('Delete')
        .setIcon('trash')
        .onClick(async () => {
          // @ts-expect-error - Using internal Obsidian API
          await plugin.app.fileManager.promptForFileDeletion(file)
        })
    })

    menu.showAtMouseEvent(mouseEvent)
  }

  async function switchProject(projectId: string) {
    if (projectId) {
      await plugin.projectManager.setActiveProject(projectId)
    }
  }
</script>

<div class="lighthouse-explorer">
  <div class="nav-header">
    <div class="nav-buttons-container">
      {#if allProjects.length > 0}
        <select
          class="dropdown lighthouse-project-picker"
          value={currentProject?.id || ''}
          onchange={(e) => switchProject(e.currentTarget.value)}
        >
          <option value="">Select project...</option>
          {#each allProjects as project (project.id)}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      {:else}
        <div class="nav-folder-title" data-path="">Project Explorer</div>
      {/if}
    </div>
  </div>

  {#if !currentProject}
    <div class="pane-empty">
      No active project<br />
      <span class="pane-empty-message">Select a project to see its files</span>
    </div>
  {:else if contentNodes.length === 0 && sourceNodes.length === 0}
    <div class="pane-empty">No files found</div>
  {:else}
    <div class="nav-files-container">
      {#if contentNodes.length > 0}
        <div class="tree-item nav-folder mod-root" class:is-collapsed={contentCollapsed}>
          <div
            class="tree-item-self is-clickable nav-folder-title"
            role="button"
            tabindex="0"
            onclick={() => (contentCollapsed = !contentCollapsed)}
            onkeydown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && (contentCollapsed = !contentCollapsed)}
          >
            <div class="tree-item-icon">
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
                class="svg-icon lucide-folder"
              >
                <path
                  d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
                />
              </svg>
            </div>
            <div class="tree-item-inner">Content</div>
            <div class="tree-item-flair-outer">
              <span class="tree-item-flair">{contentNodes.length}</span>
            </div>
          </div>
          {#if !contentCollapsed}
            <div class="tree-item-children">
              {#each contentNodes as node (node.path)}
                <TreeNodeComponent
                  {node}
                  depth={0}
                  {activeFilePath}
                  ontoggle={handleToggle}
                  onopen={handleOpen}
                  oncontextmenu={handleContextMenu}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if sourceNodes.length > 0}
        <div class="tree-item nav-folder mod-root" class:is-collapsed={sourceCollapsed}>
          <div
            class="tree-item-self is-clickable nav-folder-title"
            role="button"
            tabindex="0"
            onclick={() => (sourceCollapsed = !sourceCollapsed)}
            onkeydown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && (sourceCollapsed = !sourceCollapsed)}
          >
            <div class="tree-item-icon">
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
                class="svg-icon lucide-folder-pen"
              >
                <path d="M8.42 10.61a2.1 2.1 0 1 1 2.97 2.97L5.95 19 2 20l.99-3.95 5.43-5.44Z" />
                <path
                  d="M2 11.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"
                />
              </svg>
            </div>
            <div class="tree-item-inner">Source</div>
            <div class="tree-item-flair-outer">
              <span class="tree-item-flair">{sourceNodes.length}</span>
            </div>
          </div>
          {#if !sourceCollapsed}
            <div class="tree-item-children">
              {#each sourceNodes as node (node.path)}
                <TreeNodeComponent
                  {node}
                  depth={0}
                  {activeFilePath}
                  ontoggle={handleToggle}
                  onopen={handleOpen}
                  oncontextmenu={handleContextMenu}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lighthouse-explorer {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .pane-empty-message {
    color: var(--text-faint);
    font-size: var(--font-ui-smaller);
  }

  .lighthouse-project-picker {
    width: 100%;
    font-size: var(--font-ui-small);
    font-weight: 500;
  }
</style>
