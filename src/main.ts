import { Plugin } from 'obsidian'

import { ProjectManager } from '@/core/ProjectManager'

export default class LighthousePlugin extends Plugin {
  projectManager!: ProjectManager

  async onload() {
    console.log('Loading Lighthouse plugin')

    // Initialize project manager
    this.projectManager = new ProjectManager(this)
    await this.projectManager.initialize()

    // Log current state for debugging
    console.log('Lighthouse: Loaded', this.projectManager.getProjectCount(), 'projects')
    const activeProject = this.projectManager.getActiveProject()
    if (activeProject) {
      console.log('Lighthouse: Active project:', activeProject.name)
    }

    // Add a simple command to verify the plugin works
    this.addCommand({
      id: 'lighthouse-hello',
      name: 'Say hello',
      callback: () => {
        const projectCount = this.projectManager.getProjectCount()
        console.log(`Lighthouse: ${projectCount} projects loaded`)
      },
    })
  }

  onunload() {
    console.log('Unloading Lighthouse plugin')
  }
}
