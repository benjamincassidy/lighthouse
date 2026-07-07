<script lang="ts">

  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import SheetCard from '@/ui/components/SheetCard.svelte'
  import { buildFileContextMenu } from '@/ui/menus/buildFileContextMenu'

  import type { TFile } from 'obsidian'

  interface TreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: TreeNode[]
    status?: string
  }

  interface ReorderDetail {
    draggedPath: string
    targetPath: string
    position: 'before' | 'after'
  }

  interface Group {
    label: string | null
    files: TreeNode[]
  }

  interface Props {
    plugin: LighthousePlugin
    selectedNode: TreeNode | null
    currentProject: Project | undefined
    activeFilePath: string | null
    titles?: Map<string, string>
    previews?: Map<string, string>
    fileGoals?: Record<string, number>
    fileWordCounts?: Map<string, number>
    onopen?: (_event: CustomEvent<{ path: string }>) => void
    onreorder?: (_event: CustomEvent<ReorderDetail>) => void
    onNewSheet?: (_folderPath: string) => void | Promise<void>
    onGoalChanged?: () => void | Promise<void>
  }

  let {
    plugin,
    selectedNode,
    currentProject,
    activeFilePath,
    titles,
    previews,
    fileGoals,
    fileWordCounts,
    onopen,
    onreorder,
    onNewSheet,
    onGoalChanged,
  }: Props = $props()

  function handleNewSheet() {
    if (selectedNode && onNewSheet) {
      void onNewSheet(selectedNode.path)
    }
  }

  // Direct files render unlabeled; each subfolder's direct files render under
  // its name as a label — one level of flattening, matching Ulysses' Sheet
  // List behavior when a parent group (e.g. "Chapters") is selected.
  let groups = $derived.by((): Group[] => {
    if (!selectedNode?.children) return []
    const direct = selectedNode.children.filter((c) => c.type === 'file')
    const subfolders = selectedNode.children.filter((c) => c.type === 'folder')

    const result: Group[] = []
    if (direct.length > 0) {
      result.push({ label: null, files: direct })
    }
    for (const sub of subfolders) {
      result.push({
        label: sub.name,
        files: (sub.children ?? []).filter((c) => c.type === 'file'),
      })
    }
    return result
  })

  function handleMenu(event: CustomEvent<{ path: string; mouseEvent: globalThis.MouseEvent }>) {
    const file = plugin.app.vault.getAbstractFileByPath(event.detail.path)
    if (!file || 'children' in file) return

    const menu = buildFileContextMenu({
      plugin,
      file: file as TFile,
      currentProject,
      onGoalChanged: async () => {
        if (onGoalChanged) await onGoalChanged()
      },
    })
    menu.showAtMouseEvent(event.detail.mouseEvent)
  }
</script>

<div class="lh-sheet-list">
  {#if selectedNode}
    <div class="lh-sheet-list-header">
      <span class="lh-sheet-list-title">{selectedNode.name}</span>
      <button
        class="lh-new-sheet-btn"
        onclick={handleNewSheet}
        aria-label="New sheet"
        title="New sheet"
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
          ><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
        >
      </button>
    </div>
  {/if}

  {#if !selectedNode}
    <div class="pane-empty">Select a group to see its sheets</div>
  {:else if !selectedNode.children || selectedNode.children.length === 0}
    <div class="pane-empty">No sheets in this group</div>
  {:else}
    {#each groups as group, gi (group.label ?? gi)}
      {#if group.label}
        <div class="lh-sheet-group-label">{group.label}</div>
      {/if}
      {#each group.files as file (file.path)}
        <SheetCard
          path={file.path}
          filename={file.name.replace(/\.md$/, '')}
          title={titles?.get(file.path) ?? file.name.replace(/\.md$/, '')}
          preview={previews?.get(file.path) ?? ''}
          status={file.status}
          goal={fileGoals?.[file.path]}
          wordCount={fileWordCounts?.get(file.path) ?? 0}
          isActive={file.path === activeFilePath}
          {onopen}
          onmenu={handleMenu}
          {onreorder}
        />
      {/each}
    {/each}
  {/if}
</div>

<style>
  .lh-sheet-list {
    height: 100%;
    overflow-y: auto;
    padding: 6px 0;
  }

  .lh-sheet-group-label {
    padding: 8px 10px 2px;
    font-size: 0.72em;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-faint);
  }

  .lh-sheet-list-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px 8px;
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 4px;
  }

  .lh-sheet-list-title {
    flex: 1;
    min-width: 0;
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lh-new-sheet-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    box-shadow: none;
    cursor: pointer;
    color: var(--text-faint);
  }

  .lh-new-sheet-btn:hover {
    color: var(--text-normal);
  }
</style>
