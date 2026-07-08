<script lang="ts">
  import { Menu, Notice, type TFile, type TFolder } from 'obsidian'
  import { SvelteMap } from 'svelte/reactivity'

  import { DEFAULT_EXTRAS_FOLDER_NAME } from '@/core/FolderManager'
  import { activeProject, projects, workspaceActive } from '@/core/stores'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import SheetList from '@/ui/components/SheetList.svelte'
  import TreeNodeComponent from '@/ui/components/TreeNode.svelte'
  import { buildFolderContextMenu, saveGroupIcon } from '@/ui/menus/buildFolderContextMenu'
  import { ConfirmModal } from '@/ui/modals/ConfirmModal'
  import { ExportModal } from '@/ui/modals/ExportModal'
  import { GroupModal } from '@/ui/modals/GroupModal'
  import { ProjectModal } from '@/ui/modals/ProjectModal'
  import { formatDuration, readTime, speakTime } from '@/utils/deadlineUtils'
  import { reorderPaths, sortByFileOrder } from '@/utils/fileOrder'
  import { deriveSheetTitle } from '@/utils/sheetTitle'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    isExpanded?: boolean
    status?: string
  }

  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  // Groups tree: root-level items (unlabeled) + a separate Extras subtree
  let rootNodes = $state<TreeNode[]>([])
  let extrasNode = $state<TreeNode | null>(null)
  let extrasCollapsed = $state(false)
  let currentProject = $derived(activeProject ? $activeProject : undefined)
  let allProjects = $derived(projects ? $projects : [])
  let activeFilePath = $state<string | null>(null)
  let folderWordCounts = new SvelteMap<string, number>()
  let fileWordCounts = new SvelteMap<string, number>()
  let titles = new SvelteMap<string, string>()
  let previews = new SvelteMap<string, string>()

  // Quick-stats popover (Sheets/Words/Read time/Speak time) shown from the
  // header's stats icon. Computed on demand, not kept continuously live.
  let showStatsPopover = $state(false)
  let quickStats = $state<{ totalFiles: number; totalWords: number }>({
    totalFiles: 0,
    totalWords: 0,
  })
  let statsAnchorEl = $state<HTMLElement | null>(null)

  // Selected group (folder) — drives the Sheet List column. Both columns
  // stay visible together; this is not a drill-in/screen swap.
  let selectedGroupPath = $state<string | null>(null)
  let selectedNode = $derived.by(() => {
    if (!selectedGroupPath) return null
    return (
      findNodeByPath(rootNodes, selectedGroupPath) ??
      (extrasNode ? findNodeByPath([extrasNode], selectedGroupPath) : null)
    )
  })

  function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
    for (const node of nodes) {
      if (node.path === path) return node
      if (node.children) {
        const found = findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }

  // Close the stats popover on any click outside it
  $effect(() => {
    if (!showStatsPopover || !statsAnchorEl) return
    const doc = statsAnchorEl.ownerDocument
    const handleWindowClick = (e: globalThis.MouseEvent) => {
      const target = e.target as globalThis.HTMLElement | null
      if (!target?.closest('.lh-stats-popover-anchor')) {
        showStatsPopover = false
      }
    }
    // Defer registration so the click that opened the popover doesn't also close it
    const id = window.setTimeout(() => doc.addEventListener('click', handleWindowClick), 0)
    return () => {
      window.clearTimeout(id)
      doc.removeEventListener('click', handleWindowClick)
    }
  })

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
    plugin.registerEvent(
      plugin.app.vault.on('delete', async (file) => {
        plugin.firstLineCache.invalidate(file.path)
        await refreshTree()
      }),
    )

    // Rebuild tree when any file's frontmatter changes (status: field)
    plugin.registerEvent(
      plugin.app.metadataCache.on('changed', () => {
        if (currentProject) void buildProjectTree(currentProject)
      }),
    )

    // On rename: keep fileOrder + first-line cache in sync, then rebuild
    plugin.registerEvent(
      plugin.app.vault.on('rename', async (file, oldPath) => {
        plugin.firstLineCache.rename(oldPath, file.path)
        if (currentProject) {
          await plugin.projectManager.updateFileOrderPath(currentProject.id, oldPath, file.path)
          await plugin.projectManager.updateFolderKeyedRecords(
            currentProject.id,
            oldPath,
            file.path,
          )
        }
        await refreshTree()
      }),
    )
  })

  // Rebuild tree + restore last-selected group when active project changes
  $effect(() => {
    if (!plugin) {
      rootNodes = []
      extrasNode = null
    } else if (currentProject) {
      buildProjectTree(currentProject)
      selectedGroupPath = plugin.workspaceManager.getLastGroupPath(currentProject.id) ?? null
    } else {
      rootNodes = []
      extrasNode = null
      selectedGroupPath = null
    }
  })

  // Resolve each visible file's first-line title + preview, Ulysses-style,
  // via the shared FirstLineCache so re-renders don't re-read every file.
  $effect(() => {
    for (const path of collectFilePaths([...rootNodes, ...(extrasNode ? [extrasNode] : [])])) {
      const file = plugin.app.vault.getAbstractFileByPath(path)
      if (file && !('children' in file)) {
        const tFile = file as TFile
        void plugin.firstLineCache.getFirstLine(tFile).then((firstLine) => {
          titles.set(path, deriveSheetTitle(firstLine, tFile.basename))
        })
        void plugin.firstLineCache.getPreview(tFile).then((preview) => {
          previews.set(path, preview)
        })
      }
    }
  })

  /**
   * Every project has Extras. Creates the folder on disk and persists
   * `extrasFolder` the first time this project is viewed if it's missing —
   * a no-op on every subsequent call once it exists.
   */
  async function ensureExtrasFolder(project: Project): Promise<Project> {
    const relPath = project.extrasFolder || DEFAULT_EXTRAS_FOLDER_NAME
    const fullPath = plugin.folderManager.resolveProjectPath(project.rootPath, relPath)
    const existing = plugin.app.vault.getAbstractFileByPath(fullPath)

    if (existing && 'children' in existing) {
      if (project.extrasFolder === relPath) return project
      const updated = { ...project, extrasFolder: relPath, updatedAt: new Date().toISOString() }
      await plugin.projectManager.updateProject(updated)
      return updated
    }

    await plugin.app.vault.createFolder(fullPath)
    const updated = { ...project, extrasFolder: relPath, updatedAt: new Date().toISOString() }
    await plugin.projectManager.updateProject(updated)
    return updated
  }

  async function buildProjectTree(project: Project) {
    if (!plugin) {
      console.error('Lighthouse: ProjectExplorer plugin is undefined')
      rootNodes = []
      extrasNode = null
      return
    }

    const vault = plugin.app.vault
    const rootFolder = vault.getAbstractFileByPath(project.rootPath)

    if (!rootFolder || !('children' in rootFolder)) {
      console.warn('Lighthouse: Root folder not found:', project.rootPath)
      rootNodes = []
      extrasNode = null
      return
    }

    const resolvedProject = await ensureExtrasFolder(project)

    const mainNode = buildTreeNode(rootFolder as TFolder, resolvedProject, true)
    rootNodes = mainNode?.children ?? []

    const extrasPath = plugin.folderManager.resolveProjectPath(
      resolvedProject.rootPath,
      resolvedProject.extrasFolder as string,
    )
    const extrasFolder = vault.getAbstractFileByPath(extrasPath)
    extrasNode =
      extrasFolder && 'children' in extrasFolder
        ? buildTreeNode(extrasFolder as TFolder, resolvedProject, false)
        : null

    // Async-load word counts for folders/files that have goals set
    await loadFolderWordCounts(resolvedProject)
    await loadFileWordCounts(resolvedProject)
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

  /**
   * Build a folder's tree node. When `skipExtras` is true (building the main
   * root tree), any child matching the project's Extras folder is omitted —
   * it's rendered separately as its own section instead.
   */
  function buildTreeNode(folder: TFolder, project: Project, skipExtras: boolean): TreeNode | null {
    const children: TreeNode[] = []

    for (const child of folder.children) {
      if (skipExtras && plugin.folderManager.isExtras(project, child.path)) continue

      if ('children' in child) {
        const childNode = buildTreeNode(child as TFolder, project, skipExtras)
        if (childNode) {
          children.push(childNode)
        }
      } else {
        const file = child as TFile
        if (file.extension === 'md') {
          const status = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.status as
            | string
            | undefined
          children.push({
            name: file.name,
            path: file.path,
            type: 'file',
            status,
          })
        }
      }
    }

    // Sort by custom fileOrder; fall back to folders-first alphabetical for
    // items not yet present in the order array
    const fileOrder = project.fileOrder ?? []
    const sortedChildren = sortByFileOrder(children, fileOrder)

    return {
      name: folder.name || 'Root',
      path: folder.path,
      type: 'folder',
      children: sortedChildren,
      isExpanded: true,
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

  /** Collect only file paths from a tree in depth-first order. */
  function collectFilePaths(nodes: TreeNode[]): string[] {
    const paths: string[] = []
    for (const node of nodes) {
      if (node.type === 'file') paths.push(node.path)
      if (node.children) paths.push(...collectFilePaths(node.children))
    }
    return paths
  }

  /** Handle a drag-and-drop reorder emitted by the Groups tree or Sheet List. */
  async function handleReorder(
    event: CustomEvent<{ draggedPath: string; targetPath: string; position: 'before' | 'after' }>,
  ) {
    if (!currentProject) return
    const { draggedPath, targetPath, position } = event.detail
    const allPaths = collectTreePaths([...rootNodes, ...(extrasNode ? [extrasNode] : [])])
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

    if (!toggleNodeByPath(rootNodes) && extrasNode) {
      toggleNodeByPath([extrasNode])
    }

    // Trigger reactivity in Svelte 5
    rootNodes = [...rootNodes]
    extrasNode = extrasNode ? { ...extrasNode } : null
  }

  function handleSelect(event: CustomEvent<{ path: string }>) {
    selectedGroupPath = event.detail.path
    if (currentProject) {
      void plugin.workspaceManager.setLastGroupPath(currentProject.id, selectedGroupPath)
    }
  }

  async function handleOpen(event: CustomEvent<{ path: string }>) {
    const path = event.detail.path
    const file = plugin.app.vault.getAbstractFileByPath(path)
    if (file && !('children' in file)) {
      const leaf = plugin.app.workspace.getLeaf(false)
      await leaf.openFile(file as TFile)
    }
  }

  function handleFolderMenu(
    event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>,
  ) {
    const { path, mouseEvent } = event.detail
    const folder = plugin.app.vault.getAbstractFileByPath(path)
    if (!folder || !('children' in folder)) return

    const menu = buildFolderContextMenu({
      plugin,
      folder: folder as TFolder,
      currentProject,
      onGroupChanged: async () => {
        if (currentProject) await buildProjectTree(currentProject)
      },
    })
    menu.showAtMouseEvent(mouseEvent)
  }

  function createNewProject() {
    const modal = new ProjectModal(plugin, 'create')
    modal.open()
  }

  function exitWorkspace() {
    void plugin.workspaceManager.exitWritingWorkspace()
  }

  /** Create a new sheet directly inside the given group — the Sheet List's "new sheet" action. */
  async function createSheetInGroup(folderPath: string) {
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

  function createRootFolder() {
    if (!currentProject) return
    const project = currentProject
    new GroupModal(
      plugin,
      { mode: 'create', parentPath: project.rootPath },
      async (newPath, iconId) => {
        await saveGroupIcon(plugin, project.id, newPath, newPath, iconId)
        await buildProjectTree(project)
      },
    ).open()
  }

  function createExtrasGroup() {
    if (!currentProject) return
    const project = currentProject
    const parentPath = plugin.folderManager.resolveProjectPath(
      project.rootPath,
      project.extrasFolder || DEFAULT_EXTRAS_FOLDER_NAME,
    )
    new GroupModal(plugin, { mode: 'create', parentPath }, async (newPath, iconId) => {
      await saveGroupIcon(plugin, project.id, newPath, newPath, iconId)
      await buildProjectTree(project)
    }).open()
  }

  function toggleExtrasCollapsed() {
    extrasCollapsed = !extrasCollapsed
  }

  async function toggleStatsPopover() {
    if (showStatsPopover) {
      showStatsPopover = false
      return
    }
    if (currentProject) {
      const result = await plugin.hierarchicalCounter.countProject(currentProject)
      quickStats = { totalFiles: result.totalFiles, totalWords: result.totalWords }
    }
    showStatsPopover = true
  }

  function showProjectMenu(event: globalThis.MouseEvent) {
    if (!currentProject) return
    const project = currentProject

    const menu = new Menu()

    menu.addItem((item) => {
      item
        .setTitle('Edit project…')
        .setIcon('pencil')
        .onClick(() => {
          new ProjectModal(plugin, 'edit', project).open()
        })
    })

    menu.addItem((item) => {
      item
        .setTitle('Export…')
        .setIcon('download')
        .onClick(() => {
          new ExportModal(plugin, project).open()
        })
    })

    menu.addSeparator()

    menu.addItem((item) => {
      item
        .setTitle('Delete project')
        .setIcon('trash')
        .onClick(() => {
          new ConfirmModal(plugin.app, {
            title: 'Delete project',
            message: `Are you sure you want to delete "${project.name}"?`,
            note: 'Only the project configuration is removed. Your files stay untouched.',
            onConfirm: async () => {
              try {
                await plugin.projectManager.deleteProject(project.id)
              } catch (error) {
                console.error('Error deleting project:', error)
                new Notice('Failed to delete project. See console for details.')
              }
            },
          }).open()
        })
    })

    menu.showAtMouseEvent(event)
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

    <h2 class="lh-project-title">
      {currentProject?.name ?? 'No project selected'}
    </h2>

    {#if currentProject?.wordCountGoal}
      <div class="lh-project-goal-row">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span>{currentProject.wordCountGoal.toLocaleString()} words</span>
      </div>
    {/if}

    {#if currentProject}
      <div class="lh-project-actions-row">
        <div class="lh-stats-popover-anchor" bind:this={statsAnchorEl}>
          <button
            class="lh-icon-action-btn"
            onclick={toggleStatsPopover}
            aria-label="Project stats"
            title="Project stats"
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
              ><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line
                x1="6"
                y1="20"
                x2="6"
                y2="14"
              /></svg
            >
          </button>
          {#if showStatsPopover}
            <div class="lh-stats-popover">
              <div class="lh-stats-popover-row">
                <span>Sheets</span>
                <span>{quickStats.totalFiles.toLocaleString()}</span>
              </div>
              <div class="lh-stats-popover-row">
                <span>Words</span>
                <span>{quickStats.totalWords.toLocaleString()}</span>
              </div>
              <div class="lh-stats-popover-divider"></div>
              <div class="lh-stats-popover-row">
                <span>Read time</span>
                <span>{formatDuration(readTime(quickStats.totalWords))}</span>
              </div>
              <div class="lh-stats-popover-row">
                <span>Speak time</span>
                <span>{formatDuration(speakTime(quickStats.totalWords))}</span>
              </div>
            </div>
          {/if}
        </div>
        <button
          class="lh-icon-action-btn"
          onclick={createRootFolder}
          aria-label="New group"
          title="New group"
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
            /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg
          >
        </button>
        <button
          class="lh-icon-action-btn"
          onclick={showProjectMenu}
          aria-label="Project actions"
          title="Project actions"
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
            ><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle
              cx="5"
              cy="12"
              r="1"
            /></svg
          >
        </button>
      </div>
    {/if}
  </div>

  {#if !currentProject}
    <div class="pane-empty">
      {#if allProjects.length === 0}
        No projects yet<br />
        <button class="mod-cta" onclick={createNewProject}>Create Your First Project</button>
      {:else}
        No active project<br />
        <span class="pane-empty-message">Select a project to see its files</span>
      {/if}
    </div>
  {:else if rootNodes.length === 0 && !extrasNode}
    <div class="pane-empty">No files found</div>
  {:else}
    <div class="lh-explorer-body" class:has-selection={selectedGroupPath}>
      <div class="lh-groups-column">
        {#each rootNodes as node (node.path)}
          <TreeNodeComponent
            {node}
            depth={0}
            selectedPath={selectedGroupPath}
            folderGoals={currentProject?.folderGoals}
            folderIcons={currentProject?.folderIcons}
            {folderWordCounts}
            ontoggle={handleToggle}
            onselect={handleSelect}
            onfoldermenu={handleFolderMenu}
            onreorder={handleReorder}
          />
        {/each}

        <div class="lh-extras-header">
          <span class="lh-section-label lh-extras-label">Extras</span>
          <div class="lh-extras-actions">
            <button
              class="lh-extras-icon-btn"
              onclick={createExtrasGroup}
              aria-label="New group"
              title="New group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
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
            <button
              class="lh-extras-icon-btn"
              onclick={toggleExtrasCollapsed}
              aria-label={extrasCollapsed ? 'Show extras' : 'Hide extras'}
              title={extrasCollapsed ? 'Show extras' : 'Hide extras'}
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
                class="lh-chevron-icon"
                class:is-collapsed={extrasCollapsed}><path d="M3 8L12 17L21 8" /></svg
              >
            </button>
          </div>
        </div>
        {#if !extrasCollapsed && extrasNode?.children}
          {#each extrasNode.children as node (node.path)}
            <TreeNodeComponent
              {node}
              depth={0}
              selectedPath={selectedGroupPath}
              folderGoals={currentProject?.folderGoals}
              folderIcons={currentProject?.folderIcons}
              {folderWordCounts}
              iconColor="var(--lh-extras-color)"
              ontoggle={handleToggle}
              onselect={handleSelect}
              onfoldermenu={handleFolderMenu}
              onreorder={handleReorder}
            />
          {/each}
        {/if}
      </div>

      <div class="lh-sheetlist-column">
        <SheetList
          {plugin}
          {selectedNode}
          {currentProject}
          {activeFilePath}
          {titles}
          {previews}
          fileGoals={currentProject?.fileGoals}
          {fileWordCounts}
          onopen={handleOpen}
          onreorder={handleReorder}
          onNewSheet={createSheetInGroup}
          onGoalChanged={() => currentProject && loadFileWordCounts(currentProject)}
          onback={() => (selectedGroupPath = null)}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .lighthouse-explorer {
    height: 100%;
    display: flex;
    flex-direction: column;
    --lh-accent: var(--interactive-accent);
    --lh-accent-subtle: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
    /* Distinct tint for Extras — sets it apart from the main content tree,
       matching Ulysses' own coloring of its Extras/reference groups. */
    --lh-extras-color: var(--color-purple, #a78bfa);
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
    flex-shrink: 0;
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
    border-radius: 50%;
    box-shadow: none;
    cursor: pointer;
    color: var(--text-muted);
    line-height: 0;
  }

  .lh-exit-btn:hover {
    color: var(--text-normal);
  }

  /* Prominent, Ulysses-style project title — plain text, no picker.
     Switching projects happens via the command palette ("Switch project"),
     not a dropdown here. */
  .lh-project-title {
    margin: 2px 4px 0;
    font-size: 1.3em;
    font-weight: 700;
    line-height: 1.2;
    color: var(--text-normal);
    overflow-wrap: break-word;
  }

  .lh-project-goal-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 6px 4px 0;
    color: var(--text-muted);
    font-size: var(--font-ui-small);
  }

  .lh-project-actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 2px;
    margin-top: 8px;
  }

  .lh-icon-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    box-shadow: none;
    cursor: pointer;
    color: var(--text-faint);
  }

  .lh-icon-action-btn:hover {
    color: var(--text-normal);
  }

  .lh-stats-popover-anchor {
    position: relative;
  }

  .lh-stats-popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 50;
    min-width: 180px;
    padding: 10px 12px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .lh-stats-popover-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 3px 0;
    font-size: var(--font-ui-small);
    color: var(--text-normal);
  }

  .lh-stats-popover-row span:first-child {
    color: var(--text-muted);
  }

  .lh-stats-popover-row span:last-child {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .lh-stats-popover-divider {
    height: 1px;
    background: var(--background-modifier-border);
    margin: 4px 0;
  }

  /* ─── Two-column body: Groups tree | Sheet List ───
     The pane is itself the resize container: below lh-library-narrow-max
     it collapses to a single drilling column (Groups, then Sheet List,
     with a back button), matching a narrow Ulysses-style nested menu.
     At or above that width it's the always-visible two-column browser,
     with the Groups column capped so only the Sheet List keeps growing. */
  .lighthouse-explorer {
    container-type: inline-size;
    container-name: lh-library;
  }

  .lh-explorer-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row;
  }

  .lh-groups-column {
    flex: 0 1 42%;
    max-width: 220px;
    min-width: 0;
    overflow-y: auto;
    border-right: 1px solid var(--background-modifier-border);
    padding: 4px 0;
  }

  .lh-sheetlist-column {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }

  /* Narrow pane: drill between Groups and Sheet List instead of splitting
     the width between two columns. */
  @container lh-library (max-width: 340px) {
    .lh-groups-column {
      flex: 1 1 100%;
      max-width: none;
      border-right: none;
    }

    .lh-sheetlist-column {
      flex: 1 1 100%;
    }

    .lh-explorer-body:not(.has-selection) .lh-sheetlist-column {
      display: none;
    }

    .lh-explorer-body.has-selection .lh-groups-column {
      display: none;
    }
  }

  .lh-extras-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 6px 4px 10px;
    border-radius: var(--radius-s);
  }

  .lh-extras-header:hover {
    background: var(--background-modifier-hover);
  }

  .lh-extras-label {
    margin: 0;
  }

  .lh-extras-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .lh-extras-header:hover .lh-extras-actions,
  .lh-extras-actions:focus-within {
    opacity: 1;
  }

  .lh-extras-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    box-shadow: none;
    cursor: pointer;
    color: var(--text-faint);
  }

  .lh-extras-icon-btn:hover {
    color: var(--text-normal);
  }

  .lh-extras-icon-btn .lh-chevron-icon {
    transition: transform 100ms ease-in-out;
  }

  .lh-extras-icon-btn .lh-chevron-icon.is-collapsed {
    transform: rotate(-90deg);
  }
</style>
