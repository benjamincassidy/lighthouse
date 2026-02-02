import { FuzzySuggestModal, Notice } from 'obsidian'

import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'

/**
 * Modal for quickly switching between projects
 */
export class ProjectSwitcherModal extends FuzzySuggestModal<Project> {
  plugin: LighthousePlugin

  constructor(plugin: LighthousePlugin) {
    super(plugin.app)
    this.plugin = plugin
    this.setPlaceholder('Type to search for a project...')
  }

  getItems(): Project[] {
    return this.plugin.projectManager.getAllProjects()
  }

  getItemText(project: Project): string {
    return project.name
  }

  onChooseItem(project: Project): void {
    const currentProjectId = this.plugin.projectManager.getActiveProjectId()

    // Don't switch if already active
    if (currentProjectId === project.id) {
      new Notice(`Project "${project.name}" is already active`)
      return
    }

    // Switch to the selected project
    this.plugin.projectManager
      .setActiveProject(project.id)
      .then(() => {
        new Notice(`Switched to project: ${project.name}`)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        new Notice(`Failed to switch project: ${message}`)
        console.error('Error switching project:', error)
      })
  }
}
