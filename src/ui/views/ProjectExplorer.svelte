<script lang="ts">
  import { Menu, type TFile, type TFolder } from 'obsidian'
  import { SvelteMap } from 'svelte/reactivity'

  import { activeProject, workspaceActive } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import TreeNodeComponent from '@/ui/components/TreeNode.svelte'
  import { FileGoalModal } from '@/ui/modals/FileGoalModal'
  import { ProjectSwitcherModal } from '@/ui/modals/ProjectSwitcher'
  import { reorderPaths, sortByFileOrder } from '@/utils/fileOrder'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    isExpanded?: boolean
    folderType?: 'content' | 'source'
    status?: string
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
  let activeFilePath = $state<string | null>(null)
  let folderWordCounts = new SvelteMap<string, number>()
  let fileWordCounts = new SvelteMap<string, number>()

  // Track active file changes + react to vault mutations
  $effect(() => {
    const updateActiveFile = () => {
      const file = plugin.app.workspace.getActiveFile()
      activeFilePath = file?.path || null
    }

    updateActiveFile()

    plugin.registerEvent(plugin.app.workspace.on('active-leaf-change', updateActiveFile))

    // Rebuild tree whenever files/folders are created or deleted
    const refreshTree = async () => {
      if (currentProject) await buildProjectTree(currentProject)
    }
    plugin.registerEvent(plugin.app.vault.on('create', refreshTree))
    plugin.registerEvent(plugin.app.vault.on('delete', refreshTree))

    // Rebuild tree when any file's frontmatter changes (status: field)
    plugin.registerEvent(
      plugin.app.metadataCache.on('changed', () => {
        if (currentProject) void buildProjectTree(currentProject)
      }),
    )

    // On rename: keep fileOrder in sync, then rebuild
    plugin.registerEvent(
      plugin.app.vault.on('rename', async (file, oldPath) => {
        if (currentProject) {
          await plugin.projectManager.updateFileOrderPath(currentProject.id, oldPath, file.path)
        }
        await refreshTree()
      }),
    )
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

  async function buildProjectTree(project: Project) {
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

    // Set tree immediately for fast display
    contentNodes = content
    sourceNodes = source

    // Async-load word counts for folders that have goals set
    await loadFolderWordCounts(project)
    await loadFileWordCounts(project)
  }

  async function loadFileWordCounts(project: Project): Promise<void> {
    const goals = project.fileGoals
    fileWordCounts.clear()
    if (!goals || Object.keys(goals).length === 0) return
    for (const filePath of Object.keys(goals)) {
      const file = plugin.app.vault.getAbstractFileByPath(filePath)
      if (file && !('children' in file)) {
        const result = await plugin.hierarchicalCounter.countFile(file as TFile)
        if (result) fileWordCounts.set(filePath, result.words)
      }
    }
  }

  async function loadFolderWordCounts(project: Project): Promise<void> {
    const goals = project.folderGoals
    folderWordCounts.clear()
    if (!goals || Object.keys(goals).length === 0) return
    for (const folderPath of Object.keys(goals)) {
      const stats = await plugin.hierarchicalCounter.countFolder(folderPath)
      if (stats) folderWordCounts.set(folderPath, stats.wordCount)
    }
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
          const status = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.status as
            | string
            | undefined
          children.push({
            name: file.name,
            path: file.path,
            type: 'file',
            folderType,
            status,
          })
        }
      }
    }

    // Sort by custom fileOrder; fall back to folders-first alphabetical for
    // items not yet present in the order array
    const fileOrder = project?.fileOrder ?? []
    const sortedChildren = sortByFileOrder(children, fileOrder)

    return {
      name: folder.name || 'Root',
      path: folder.path,
      type: 'folder',
      children: sortedChildren,
      isExpanded: true,
      folderType,
    }
  }

  /** Collect every path (files and folders) from a tree in depth-first order. */
  function collectTreePaths(nodes: TreeNode[]): string[] {
    const paths: string[] = []
    for (const node of nodes) {
      paths.push(node.path)
      if (node.children) paths.push(...collectTreePaths(node.children))
    }
    return paths
  }

  /** Handle a drag-and-drop reorder emitted by any TreeNode. */
  async function handleReorder(
    event: CustomEvent<{ draggedPath: string; targetPath: string; position: 'before' | 'after' }>,
  ) {
    if (!currentProject) return
    const { draggedPath, targetPath, position } = event.detail
    const allPaths = collectTreePaths([...contentNodes, ...sourceNodes])
    const newOrder = reorderPaths(
      currentProject.fileOrder ?? [],
      allPaths,
      draggedPath,
      targetPath,
      position,
    )
    await plugin.projectManager.reorderProjectFiles(currentProject.id, newOrder)
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

    // Per-file word count goal (files only)
    if (!('children' in file)) {
      menu.addSeparator()
      const currentGoal = currentProject?.fileGoals?.[path]
      menu.addItem((item) => {
        item
          .setTitle(currentGoal ? 'Edit file word count goal' : 'Set file word count goal')
          .setIcon('target')
          .onClick(() => {
            if (!currentProject) return
            new FileGoalModal(plugin, currentGoal, async (goal) => {
              const fileGoals = { ...(currentProject.fileGoals ?? {}) }
              if (goal === undefined) {
                delete fileGoals[path]
              } else {
                fileGoals[path] = goal
              }
              await plugin.projectManager.updateProject({
                ...currentProject,
                fileGoals: Object.keys(fileGoals).length > 0 ? fileGoals : undefined,
                updatedAt: new Date().toISOString(),
              })
              await loadFileWordCounts(currentProject)
            }).open()
          })
      })
    }

    menu.showAtMouseEvent(mouseEvent)
  }

  function openProjectSwitcher() {
    new ProjectSwitcherModal(plugin).open()
  }

  function exitWorkspace() {
    void plugin.workspaceManager.exitWritingWorkspace()
  }

  async function handleCreateNoteInFolder(event: CustomEvent<{ path: string }>) {
    const folderPath = event.detail.path
    let fileName = 'Untitled.md'
    let n = 1
    while (plugin.app.vault.getAbstractFileByPath(`${folderPath}/${fileName}`)) {
      fileName = `Untitled ${n++}.md`
    }
    const newFile = await plugin.app.vault.create(`${folderPath}/${fileName}`, '')
    const leaf = plugin.app.workspace.getLeaf(false)
    await leaf.openFile(newFile)
    // @ts-expect-error - Using internal Obsidian API to start rename
    plugin.app.fileManager.promptForFileRename(newFile)
  }

  async function createFolderInSection(sectionType: 'content' | 'source') {
    if (!currentProject) return
    let folderName = 'New Folder'
    let n = 1
    while (plugin.app.vault.getAbstractFileByPath(`${currentProject.rootPath}/${folderName}`)) {
      folderName = `New Folder ${n++}`
    }
    await plugin.app.vault.createFolder(`${currentProject.rootPath}/${folderName}`)
    // Add relative path to project config — store update triggers tree rebuild via $effect
    const updatedProject: Project = {
      ...currentProject,
      contentFolders:
        sectionType === 'content'
          ? [...currentProject.contentFolders, folderName]
          : [...currentProject.contentFolders],
      sourceFolders:
        sectionType === 'source'
          ? [...currentProject.sourceFolders, folderName]
          : [...currentProject.sourceFolders],
    }
    await plugin.projectManager.updateProject(updatedProject)
  }
</script>

<div class="lighthouse-explorer">
  <div class="lh-workspace-header">
    <div class="lh-brand-row">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--lh-accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lh-brand-icon"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" /><path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" /><path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <span class="lh-brand-name">Lighthouse</span>
      {#if $workspaceActive}
        <button class="lh-exit-btn" onclick={exitWorkspace} aria-label="Exit Writing Workspace">
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
            ><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg
          >
        </button>
      {/if}
    </div>

    <button class="lh-project-name-btn" onclick={openProjectSwitcher} aria-label="Switch project">
      <span class="lh-project-name">
        {currentProject?.name ?? 'Select a project…'}
      </span>
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
        class="lh-project-chevron"><polyline points="6 9 12 15 18 9" /></svg
      >
    </button>

    <div class="lh-mode-tabs" role="tablist">
      <button class="lh-mode-tab lh-mode-tab-active" role="tab" aria-selected="true">Write</button>
      <button class="lh-mode-tab" role="tab" disabled aria-selected="false">Outline</button>
      <button class="lh-mode-tab" role="tab" disabled aria-selected="false">Corkboard</button>
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
            <button
              class="clickable-icon lh-section-add-btn"
              onclick={(e) => {
                e.stopPropagation()
                createFolderInSection('content')
              }}
              aria-label="New folder in Content"
            >
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
                ><path
                  d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                /><line x1="12" y1="11" x2="12" y2="17" /><line
                  x1="9"
                  y1="14"
                  x2="15"
                  y2="14"
                /></svg
              >
            </button>
          </div>
          {#if !contentCollapsed}
            <div class="tree-item-children">
              {#each contentNodes as node (node.path)}
                <TreeNodeComponent
                  {node}
                  depth={0}
                  {activeFilePath}
                  folderGoals={currentProject?.folderGoals}
                  {folderWordCounts}
                  fileGoals={currentProject?.fileGoals}
                  {fileWordCounts}
                  ontoggle={handleToggle}
                  onopen={handleOpen}
                  onfilemenu={handleContextMenu}
                  oncreatenote={handleCreateNoteInFolder}
                  onreorder={handleReorder}
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
            <button
              class="clickable-icon lh-section-add-btn"
              onclick={(e) => {
                e.stopPropagation()
                createFolderInSection('source')
              }}
              aria-label="New folder in Source"
            >
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
                ><path
                  d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                /><line x1="12" y1="11" x2="12" y2="17" /><line
                  x1="9"
                  y1="14"
                  x2="15"
                  y2="14"
                /></svg
              >
            </button>
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
                  onfilemenu={handleContextMenu}
                  oncreatenote={handleCreateNoteInFolder}
                  onreorder={handleReorder}
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

  /* ─── Workspace header ─── */
  .lh-workspace-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .lh-brand-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .lh-brand-icon {
    flex-shrink: 0;
  }

  .lh-brand-name {
    flex: 1;
    font-size: 0.72em;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .lh-exit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    color: var(--text-muted);
    line-height: 0;
  }

  .lh-exit-btn:hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
  }

  .lh-project-name-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 3px 4px;
    background: transparent;
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    color: var(--text-normal);
    text-align: left;
  }

  .lh-project-name-btn:hover {
    background: var(--background-modifier-hover);
  }

  .lh-project-name {
    flex: 1;
    font-size: var(--font-ui-small);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lh-project-chevron {
    flex-shrink: 0;
    color: var(--text-faint);
  }

  .lh-mode-tabs {
    display: flex;
    gap: 2px;
  }

  .lh-mode-tab {
    flex: 1;
    padding: 3px 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-s);
    cursor: default;
    font-size: 0.75em;
    font-weight: 500;
    color: var(--text-faint);
    opacity: 0.5;
    transition: background 0.1s;
  }

  .lh-mode-tab-active {
    background: var(--lh-accent-subtle);
    color: var(--lh-accent);
    opacity: 1;
    cursor: default;
  }

  .lh-mode-tab:not(:disabled):not(.lh-mode-tab-active):hover {
    background: var(--background-modifier-hover);
    opacity: 1;
  }

  /* ─── Section add button ─── */
  .lh-section-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    margin-left: auto;
    width: 20px;
    height: 20px;
    padding: 0;
    color: var(--text-faint);
    box-shadow: none;
    line-height: 0;
  }

  .lh-section-add-btn:hover {
    color: var(--text-normal);
  }
</style>
