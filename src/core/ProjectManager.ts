import { Plugin } from 'obsidian'

import { ProjectStorage } from '@/core/ProjectStorage'
import {
  removeProjectFromStore,
  setActiveProjectId,
  setProjects,
  updateProjectInStore,
} from '@/core/stores'
import type { Project } from '@/types/types'

/**
 * Manages project lifecycle and business logic
 */
export class ProjectManager {
  private storage: ProjectStorage

  constructor(plugin: Plugin) {
    this.storage = new ProjectStorage(plugin)
  }

  /**
   * Initialize the project manager (loads data from disk)
   */
  async initialize(): Promise<void> {
    await this.storage.load()
    // Sync stores with loaded data
    this.syncStores()
  }

  /**
   * Sync Svelte stores with current storage state
   */
  private syncStores(): void {
    setProjects(this.storage.getProjects())
    setActiveProjectId(this.storage.getActiveProjectId())
  }

  /**
   * Create a new project
   */
  async createProject(name: string, rootPath: string): Promise<Project> {
    const project = this.storage.createProject(name, rootPath)
    await this.storage.saveProject(project)
    updateProjectInStore(project)
    return project
  }

  /**
   * Update an existing project
   */
  async updateProject(project: Project): Promise<void> {
    project.updatedAt = new Date().toISOString()
    await this.storage.saveProject(project)
    updateProjectInStore(project)
  }

  /**
   * Delete a project by ID
   */
  async deleteProject(id: string): Promise<boolean> {
    const result = await this.storage.deleteProject(id)
    if (result) {
      removeProjectFromStore(id)
      // If the deleted project was active, update the active project store
      if (this.storage.getActiveProjectId() === undefined) {
        setActiveProjectId(undefined)
      }
    }
    return result
  }

  /**
   * Get a project by ID
   */
  getProject(id: string): Project | undefined {
    return this.storage.getProject(id)
  }

  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    return this.storage.getProjects()
  }

  /**
   * Get the active project
   */
  getActiveProject(): Project | undefined {
    return this.storage.getActiveProject()
  }

  /**
   * Get the active project ID
   */
  getActiveProjectId(): string | undefined {
    return this.storage.getActiveProjectId()
  }

  /**
   * Set the active project
   */
  async setActiveProject(id: string | undefined): Promise<void> {
    if (id && !this.getProject(id)) {
      throw new Error(`Project with ID ${id} not found`)
    }
    await this.storage.setActiveProjectId(id)
    setActiveProjectId(id)
  }

  /**
   * Check if a project name already exists
   */
  projectNameExists(name: string, excludeId?: string): boolean {
    return this.storage.getProjects().some((p) => p.name === name && p.id !== excludeId)
  }

  /**
   * Get project count
   */
  getProjectCount(): number {
    return this.storage.getProjects().length
  }
}
