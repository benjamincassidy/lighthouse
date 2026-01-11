import { Plugin } from 'obsidian'

import { FolderManager } from '@/core/FolderManager'
import { ProjectManager } from '@/core/ProjectManager'
import { PROJECT_EXPLORER_VIEW_TYPE, ProjectExplorerView } from '@/ui/views/ProjectExplorerView'

export default class LighthousePlugin extends Plugin {
  projectManager!: ProjectManager
  folderManager!: FolderManager

  async onload() {
    console.log('Loading Lighthouse plugin')

    // Initialize core services
    this.folderManager = new FolderManager(this.app.vault)
    this.projectManager = new ProjectManager(this)
    await this.projectManager.initialize()

    // Register views
    this.registerView(PROJECT_EXPLORER_VIEW_TYPE, (leaf) => new ProjectExplorerView(leaf, this))

    // Add ribbon icon to open project explorer
    this.addRibbonIcon('folder-tree', 'Project Explorer', () => {
      this.activateProjectExplorer()
    })

    // Add command to open project explorer
    this.addCommand({
      id: 'lighthouse-open-project-explorer',
      name: 'Open Project Explorer',
      callback: () => {
        this.activateProjectExplorer()
      },
    })

    // Log current state for debugging
    console.log('Lighthouse: Loaded', this.projectManager.getProjectCount(), 'projects')
    const activeProject = this.projectManager.getActiveProject()
    if (activeProject) {
      console.log('Lighthouse: Active project:', activeProject.name)
    }
  }

  onunload() {
    console.log('Unloading Lighthouse plugin')
  }

  async activateProjectExplorer(): Promise<void> {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in left sidebar
      const leftLeaf = workspace.getLeftLeaf(false)
      if (!leftLeaf) {
        return
      }
      leaf = leftLeaf
      await leaf.setViewState({
        type: PROJECT_EXPLORER_VIEW_TYPE,
        active: true,
      })
    }

    workspace.revealLeaf(leaf)
  }
}
