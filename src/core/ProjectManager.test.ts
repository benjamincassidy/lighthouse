import { Plugin } from 'obsidian'
import { beforeEach, describe, expect, it } from 'vitest'

import { ProjectManager } from '@/core/ProjectManager'
import type { Project } from '@/types/types'

describe('ProjectManager', () => {
  let manager: ProjectManager
  let mockPlugin: Plugin

  beforeEach(async () => {
    // Create a mock plugin with in-memory storage
    mockPlugin = {
      loadData: async () => ({ projects: [], activeProjectId: undefined }),
      saveData: async () => undefined,
    } as unknown as Plugin

    manager = new ProjectManager(mockPlugin)
    await manager.initialize()
  })

  describe('createProject', () => {
    it('should create a new project', async () => {
      const project = await manager.createProject('My Novel', 'projects/novel')

      expect(project).toBeDefined()
      expect(project.id).toBeTruthy()
      expect(project.name).toBe('My Novel')
      expect(project.rootPath).toBe('projects/novel')
      expect(project.contentFolders).toEqual([])
      expect(project.sourceFolders).toEqual([])
      expect(project.createdAt).toBeTruthy()
      expect(project.updatedAt).toBeTruthy()
    })

    it('should add project to storage', async () => {
      await manager.createProject('Test Project', 'test')

      const projects = manager.getAllProjects()
      expect(projects).toHaveLength(1)
      expect(projects[0].name).toBe('Test Project')
    })

    it('should normalize path on creation', async () => {
      const project = await manager.createProject('Test', '/path/with/slashes/')

      expect(project.rootPath).toBe('path/with/slashes')
    })
  })

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const project = await manager.createProject('Original', 'original')
      const originalUpdatedAt = project.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      project.name = 'Updated Name'
      project.wordCountGoal = 50000
      await manager.updateProject(project)

      const updated = manager.getProject(project.id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.wordCountGoal).toBe(50000)
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('should throw on invalid project data', async () => {
      const invalidProject = {
        id: '',
        name: '',
        rootPath: '',
        contentFolders: [],
        sourceFolders: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await expect(manager.updateProject(invalidProject as Project)).rejects.toThrow()
    })
  })

  describe('deleteProject', () => {
    it('should delete an existing project', async () => {
      const project = await manager.createProject('To Delete', 'delete-me')

      const result = await manager.deleteProject(project.id)

      expect(result).toBe(true)
      expect(manager.getProject(project.id)).toBeUndefined()
      expect(manager.getAllProjects()).toHaveLength(0)
    })

    it('should return false for non-existent project', async () => {
      const result = await manager.deleteProject('non-existent-id')

      expect(result).toBe(false)
    })

    it('should clear active project if deleted', async () => {
      const project = await manager.createProject('Active', 'active')
      await manager.setActiveProject(project.id)

      await manager.deleteProject(project.id)

      expect(manager.getActiveProjectId()).toBeUndefined()
    })
  })

  describe('getProject', () => {
    it('should retrieve a project by ID', async () => {
      const created = await manager.createProject('Find Me', 'findme')

      const found = manager.getProject(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Find Me')
    })

    it('should return undefined for non-existent ID', () => {
      const found = manager.getProject('does-not-exist')

      expect(found).toBeUndefined()
    })
  })

  describe('getAllProjects', () => {
    it('should return empty array initially', () => {
      const projects = manager.getAllProjects()

      expect(projects).toEqual([])
    })

    it('should return all projects', async () => {
      await manager.createProject('Project 1', 'p1')
      await manager.createProject('Project 2', 'p2')
      await manager.createProject('Project 3', 'p3')

      const projects = manager.getAllProjects()

      expect(projects).toHaveLength(3)
      expect(projects.map((p) => p.name)).toContain('Project 1')
      expect(projects.map((p) => p.name)).toContain('Project 2')
      expect(projects.map((p) => p.name)).toContain('Project 3')
    })
  })

  describe('active project management', () => {
    it('should get and set active project', async () => {
      const project = await manager.createProject('Active', 'active')

      await manager.setActiveProject(project.id)

      expect(manager.getActiveProjectId()).toBe(project.id)
      expect(manager.getActiveProject()?.id).toBe(project.id)
    })

    it('should throw when setting non-existent project as active', async () => {
      await expect(manager.setActiveProject('non-existent')).rejects.toThrow()
    })

    it('should allow clearing active project', async () => {
      const project = await manager.createProject('Active', 'active')
      await manager.setActiveProject(project.id)

      await manager.setActiveProject(undefined)

      expect(manager.getActiveProjectId()).toBeUndefined()
      expect(manager.getActiveProject()).toBeUndefined()
    })
  })

  describe('projectNameExists', () => {
    it('should return false for unique name', async () => {
      await manager.createProject('Existing', 'existing')

      expect(manager.projectNameExists('Unique')).toBe(false)
    })

    it('should return true for duplicate name', async () => {
      await manager.createProject('Duplicate', 'dup')

      expect(manager.projectNameExists('Duplicate')).toBe(true)
    })

    it('should exclude specified project ID', async () => {
      const project = await manager.createProject('Name', 'name')

      expect(manager.projectNameExists('Name', project.id)).toBe(false)
    })
  })

  describe('getProjectCount', () => {
    it('should return 0 initially', () => {
      expect(manager.getProjectCount()).toBe(0)
    })

    it('should return correct count', async () => {
      await manager.createProject('P1', 'p1')
      await manager.createProject('P2', 'p2')

      expect(manager.getProjectCount()).toBe(2)
    })
  })
})
