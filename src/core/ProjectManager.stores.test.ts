import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'

import { ProjectManager } from '@/core/ProjectManager'
import { activeProject, activeProjectId, projects } from '@/core/stores'

import type { Plugin } from 'obsidian'

/**
 * Tests for ProjectManager integration with Svelte stores
 */
describe('ProjectManager - Store Synchronization', () => {
  let manager: ProjectManager
  let mockPlugin: Plugin

  beforeEach(async () => {
    mockPlugin = {
      loadData: () => Promise.resolve({ projects: [], activeProjectId: undefined }),
      saveData: () => Promise.resolve(undefined),
    } as unknown as Plugin

    manager = new ProjectManager(mockPlugin)
    await manager.initialize()
  })

  describe('initialization', () => {
    it('should sync stores on initialize', async () => {
      const mockProjects = [
        {
          id: '1',
          name: 'Project 1',
          rootPath: 'p1',
          contentFolders: [],
          sourceFolders: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      mockPlugin = {
        loadData: () => Promise.resolve({ projects: mockProjects, activeProjectId: '1' }),
        saveData: () => Promise.resolve(undefined),
      } as unknown as Plugin

      manager = new ProjectManager(mockPlugin)
      await manager.initialize()

      expect(get(projects)).toHaveLength(1)
      expect(get(activeProjectId)).toBe('1')
      expect(get(activeProject)?.name).toBe('Project 1')
    })
  })

  describe('createProject', () => {
    it('should update projects store on creation', async () => {
      const project = await manager.createProject('Test', 'test-path')

      const storeProjects = get(projects)
      expect(storeProjects).toHaveLength(1)
      expect(storeProjects[0].id).toBe(project.id)
      expect(storeProjects[0].name).toBe('Test')
    })
  })

  describe('updateProject', () => {
    it('should update projects store on update', async () => {
      const project = await manager.createProject('Original', 'original')

      project.name = 'Updated'
      await manager.updateProject(project)

      const storeProjects = get(projects)
      expect(storeProjects[0].name).toBe('Updated')
    })
  })

  describe('deleteProject', () => {
    it('should remove from projects store on deletion', async () => {
      const project = await manager.createProject('To Delete', 'delete-me')
      expect(get(projects)).toHaveLength(1)

      await manager.deleteProject(project.id)

      expect(get(projects)).toHaveLength(0)
    })

    it('should clear active project store if deleted', async () => {
      const project = await manager.createProject('Active', 'active')
      await manager.setActiveProject(project.id)
      expect(get(activeProjectId)).toBe(project.id)

      await manager.deleteProject(project.id)

      expect(get(activeProjectId)).toBeUndefined()
      expect(get(activeProject)).toBeUndefined()
    })
  })

  describe('setActiveProject', () => {
    it('should update activeProjectId store', async () => {
      const project = await manager.createProject('Test', 'test')

      await manager.setActiveProject(project.id)

      expect(get(activeProjectId)).toBe(project.id)
    })

    it('should update derived activeProject store', async () => {
      const project = await manager.createProject('Test', 'test')

      await manager.setActiveProject(project.id)

      const active = get(activeProject)
      expect(active).toBeDefined()
      expect(active?.id).toBe(project.id)
      expect(active?.name).toBe('Test')
    })

    it('should clear activeProject when set to undefined', async () => {
      const project = await manager.createProject('Test', 'test')
      await manager.setActiveProject(project.id)

      await manager.setActiveProject(undefined)

      expect(get(activeProjectId)).toBeUndefined()
      expect(get(activeProject)).toBeUndefined()
    })
  })
})
