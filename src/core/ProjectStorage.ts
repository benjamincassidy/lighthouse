import { Plugin } from 'obsidian'

import type { LighthouseSettings, Project } from '@/types/types'
import { generateUUID, normalizeVaultPath, validateProject } from '@/utils/validation'

const DEFAULT_SETTINGS: LighthouseSettings = {
  projects: [],
  activeProjectId: undefined,
}

/**
 * Manages project data persistence and storage
 */
export class ProjectStorage {
  private plugin: Plugin
  private settings: LighthouseSettings

  constructor(plugin: Plugin) {
    this.plugin = plugin
    this.settings = DEFAULT_SETTINGS
  }

  /**
   * Load settings from disk
   */
  async load(): Promise<void> {
    const data = (await this.plugin.loadData()) as Partial<LighthouseSettings> | undefined
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data)

    // Validate and clean up projects
    this.settings.projects = this.settings.projects.filter((project) => {
      const errors = validateProject(project)
      if (errors.length > 0) {
        console.error(`Invalid project "${project.name}" removed:`, errors)
        return false
      }
      return true
    })

    await this.save()
  }

  /**
   * Save settings to disk
   */
  async save(): Promise<void> {
    await this.plugin.saveData(this.settings)
  }

  /**
   * Get all settings
   */
  getSettings(): LighthouseSettings {
    return this.settings
  }

  /**
   * Get all projects
   */
  getProjects(): Project[] {
    return this.settings.projects
  }

  /**
   * Get a project by ID
   */
  getProject(id: string): Project | undefined {
    return this.settings.projects.find((p) => p.id === id)
  }

  /**
   * Get the active project ID
   */
  getActiveProjectId(): string | undefined {
    return this.settings.activeProjectId
  }

  /**
   * Get the active project
   */
  getActiveProject(): Project | undefined {
    if (!this.settings.activeProjectId) return undefined
    return this.getProject(this.settings.activeProjectId)
  }

  /**
   * Set the active project ID
   */
  async setActiveProjectId(id: string | undefined): Promise<void> {
    this.settings.activeProjectId = id
    await this.save()
  }

  /**
   * Add or update a project
   */
  async saveProject(project: Project): Promise<void> {
    // Validate project
    const errors = validateProject(project)
    if (errors.length > 0) {
      throw new Error(`Invalid project: ${errors.join(', ')}`)
    }

    // Normalize paths
    project.rootPath = normalizeVaultPath(project.rootPath)
    project.contentFolders = project.contentFolders.map(normalizeVaultPath)
    project.sourceFolders = project.sourceFolders.map(normalizeVaultPath)

    const index = this.settings.projects.findIndex((p) => p.id === project.id)
    if (index >= 0) {
      // Update existing
      this.settings.projects[index] = project
    } else {
      // Add new
      this.settings.projects.push(project)
    }

    await this.save()
  }

  /**
   * Create a new project with defaults
   */
  createProject(name: string, rootPath: string): Project {
    return {
      id: generateUUID(),
      name,
      rootPath: normalizeVaultPath(rootPath),
      contentFolders: [],
      sourceFolders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Delete a project by ID
   */
  async deleteProject(id: string): Promise<boolean> {
    const index = this.settings.projects.findIndex((p) => p.id === id)
    if (index < 0) return false

    this.settings.projects.splice(index, 1)

    // Clear active project if it was deleted
    if (this.settings.activeProjectId === id) {
      this.settings.activeProjectId = undefined
    }

    await this.save()
    return true
  }
}
