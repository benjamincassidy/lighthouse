import { Menu, type TFile } from 'obsidian'

import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'
import { FileGoalModal } from '@/ui/modals/FileGoalModal'
import { MergeModal } from '@/ui/modals/MergeModal'

interface BuildFileContextMenuParams {
  plugin: LighthousePlugin
  file: TFile
  currentProject: Project | undefined
  onGoalChanged: () => void | Promise<void>
}

/** `fileManager.promptForFileRename`/`promptForFileDeletion` are undocumented
 * internal Obsidian APIs with no public type — declared locally so the calls
 * below are properly typed instead of falling back to `any`. */
interface InternalFileManager {
  promptForFileRename(file: TFile): void
  promptForFileDeletion(file: TFile): Promise<void>
}

/**
 * Context menu for a Sheet List row: lets other plugins add their own items
 * first, then Lighthouse's Rename / Delete / file-goal / merge actions.
 */
export function buildFileContextMenu({
  plugin,
  file,
  currentProject,
  onGoalChanged,
}: BuildFileContextMenuParams): Menu {
  const menu = new Menu()

  plugin.app.workspace.trigger('file-menu', menu, file, 'file-explorer')

  const fileManager = plugin.app.fileManager as unknown as InternalFileManager

  menu.addItem((item) => {
    item
      .setTitle('Rename')
      .setIcon('pencil')
      .onClick(() => {
        fileManager.promptForFileRename(file)
      })
  })

  menu.addItem((item) => {
    item
      .setTitle('Delete')
      .setIcon('trash')
      .onClick(() => {
        void fileManager.promptForFileDeletion(file)
      })
  })

  menu.addSeparator()

  const currentGoal = currentProject?.fileGoals?.[file.path]
  menu.addItem((item) => {
    item
      .setTitle(currentGoal ? 'Edit file word count goal' : 'Set file word count goal')
      .setIcon('target')
      .onClick(() => {
        if (!currentProject) return
        new FileGoalModal(plugin, currentGoal, (goal) => {
          void (async () => {
            const fileGoals = { ...(currentProject.fileGoals ?? {}) }
            if (goal === undefined) {
              delete fileGoals[file.path]
            } else {
              fileGoals[file.path] = goal
            }
            await plugin.projectManager.updateProject({
              ...currentProject,
              fileGoals: Object.keys(fileGoals).length > 0 ? fileGoals : undefined,
              updatedAt: new Date().toISOString(),
            })
            await onGoalChanged()
          })()
        }).open()
      })
  })

  menu.addItem((item) => {
    item
      .setTitle('Merge into…')
      .setIcon('git-merge')
      .onClick(() => {
        const projectFiles = plugin.fileSplitter.getProjectFiles()
        new MergeModal(plugin.app, file, projectFiles, (target) => {
          void plugin.fileSplitter.mergeInto(file, target)
        }).open()
      })
  })

  return menu
}
