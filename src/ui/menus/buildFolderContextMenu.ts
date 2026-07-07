import { Menu, type TFolder } from 'obsidian'

import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'
import { GroupModal } from '@/ui/modals/GroupModal'

interface BuildFolderContextMenuParams {
  plugin: LighthousePlugin
  folder: TFolder
  currentProject: Project | undefined
  onGroupChanged: () => void | Promise<void>
}

/** `fileManager.promptForFileDeletion` is an undocumented internal Obsidian
 * API with no public type — declared locally so the call below is properly
 * typed instead of falling back to `any`. */
interface InternalFileManager {
  promptForFileDeletion(file: TFolder): Promise<void>
}

/**
 * Persist a group's chosen icon onto the project, keyed by its (possibly new,
 * post-rename) path. Always re-fetches the project fresh rather than closing
 * over a snapshot, since this runs after an async rename that may itself have
 * already touched `folderIcons` via `ProjectManager.updateFolderKeyedRecords`.
 */
export async function saveGroupIcon(
  plugin: LighthousePlugin,
  projectId: string,
  originalPath: string,
  newPath: string,
  iconId: string | undefined,
): Promise<void> {
  const project = plugin.projectManager.getProject(projectId)
  if (!project) return

  const folderIcons = { ...(project.folderIcons ?? {}) }
  delete folderIcons[originalPath]
  if (iconId) {
    folderIcons[newPath] = iconId
  } else {
    delete folderIcons[newPath]
  }

  await plugin.projectManager.updateProject({
    ...project,
    folderIcons: Object.keys(folderIcons).length > 0 ? folderIcons : undefined,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Context menu for a Groups-tree folder row: lets other plugins add their own
 * items first (mirrors Obsidian's native file-explorer menu), then Lighthouse's
 * New note / New folder / Edit group / Delete actions.
 */
export function buildFolderContextMenu({
  plugin,
  folder,
  currentProject,
  onGroupChanged,
}: BuildFolderContextMenuParams): Menu {
  const menu = new Menu()

  plugin.app.workspace.trigger('file-menu', menu, folder, 'file-explorer')

  menu.addItem((item) => {
    item
      .setTitle('Edit group…')
      .setIcon('pencil')
      .onClick(() => {
        const currentIcon = currentProject?.folderIcons?.[folder.path]
        new GroupModal(plugin, { mode: 'edit', folder, currentIcon }, async (newPath, iconId) => {
          if (!currentProject) return
          await saveGroupIcon(plugin, currentProject.id, folder.path, newPath, iconId)
          await onGroupChanged()
        }).open()
      })
  })

  menu.addItem((item) => {
    item
      .setTitle('New note')
      .setIcon('document')
      .onClick(async () => {
        const newFile = await plugin.app.vault.create(`${folder.path}/Untitled.md`, '')
        const leaf = plugin.app.workspace.getLeaf(false)
        await leaf.openFile(newFile)
      })
  })

  menu.addItem((item) => {
    item
      .setTitle('New folder')
      .setIcon('folder')
      .onClick(() => {
        new GroupModal(
          plugin,
          { mode: 'create', parentPath: folder.path },
          async (newPath, iconId) => {
            if (!currentProject) return
            await saveGroupIcon(plugin, currentProject.id, newPath, newPath, iconId)
            await onGroupChanged()
          },
        ).open()
      })
  })

  menu.addItem((item) => {
    item
      .setTitle('Delete')
      .setIcon('trash')
      .onClick(() => {
        const fileManager = plugin.app.fileManager as unknown as InternalFileManager
        void fileManager.promptForFileDeletion(folder)
      })
  })

  return menu
}
