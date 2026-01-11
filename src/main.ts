import { Plugin } from 'obsidian'

import { ProjectStorage } from '@/core/ProjectStorage'

export default class LighthousePlugin extends Plugin {
  storage!: ProjectStorage

  async onload() {
    console.log('Loading Lighthouse plugin')

    // Initialize storage
    this.storage = new ProjectStorage(this)
    await this.storage.load()

    // Log current state for debugging
    console.log('Lighthouse: Loaded', this.storage.getProjects().length, 'projects')
    const activeProject = this.storage.getActiveProject()
    if (activeProject) {
      console.log('Lighthouse: Active project:', activeProject.name)
    }

    // Add a simple command to verify the plugin works
    this.addCommand({
      id: 'lighthouse-hello',
      name: 'Say hello',
      callback: () => {
        const projectCount = this.storage.getProjects().length
        console.log(`Lighthouse: ${projectCount} projects loaded`)
      },
    })
  }

  onunload() {
    console.log('Unloading Lighthouse plugin')
  }
}
