import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  activeProject,
  activeProjectId,
  projects,
  removeProjectFromStore,
  setActiveProjectId,
  setProjects,
  updateProjectInStore,
} from '@/core/stores'
import type { Project } from '@/types/types'

describe('stores', () => {
  const createTestProject = (id: string, name: string): Project => ({
    id,
    name,
    rootPath: `projects/${name.toLowerCase()}`,
    contentFolders: [],
    sourceFolders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    // Reset stores
    setProjects([])
    setActiveProjectId(undefined)
  })

  describe('projects store', () => {
    it('should initialize empty', () => {
      expect(get(projects)).toEqual([])
    })

    it('should update with new projects', () => {
      const testProjects = [
        createTestProject('1', 'Project 1'),
        createTestProject('2', 'Project 2'),
      ]

      setProjects(testProjects)

      expect(get(projects)).toEqual(testProjects)
    })
  })

  describe('activeProjectId store', () => {
    it('should initialize undefined', () => {
      expect(get(activeProjectId)).toBeUndefined()
    })

    it('should update with new ID', () => {
      setActiveProjectId('test-id')

      expect(get(activeProjectId)).toBe('test-id')
    })

    it('should allow clearing', () => {
      setActiveProjectId('test-id')
      setActiveProjectId(undefined)

      expect(get(activeProjectId)).toBeUndefined()
    })
  })

  describe('activeProject derived store', () => {
    it('should return undefined when no active project', () => {
      expect(get(activeProject)).toBeUndefined()
    })

    it('should return active project', () => {
      const testProjects = [
        createTestProject('1', 'Project 1'),
        createTestProject('2', 'Project 2'),
      ]

      setProjects(testProjects)
      setActiveProjectId('2')

      const active = get(activeProject)
      expect(active).toBeDefined()
      expect(active?.id).toBe('2')
      expect(active?.name).toBe('Project 2')
    })

    it('should update when active ID changes', () => {
      const testProjects = [
        createTestProject('1', 'Project 1'),
        createTestProject('2', 'Project 2'),
      ]

      setProjects(testProjects)
      setActiveProjectId('1')
      expect(get(activeProject)?.name).toBe('Project 1')

      setActiveProjectId('2')
      expect(get(activeProject)?.name).toBe('Project 2')
    })

    it('should update when projects change', () => {
      const testProjects = [createTestProject('1', 'Project 1')]
      setProjects(testProjects)
      setActiveProjectId('1')

      const updatedProjects = [{ ...testProjects[0], name: 'Updated Name' }]
      setProjects(updatedProjects)

      expect(get(activeProject)?.name).toBe('Updated Name')
    })

    it('should return undefined if active project not in list', () => {
      const testProjects = [createTestProject('1', 'Project 1')]
      setProjects(testProjects)
      setActiveProjectId('non-existent')

      expect(get(activeProject)).toBeUndefined()
    })
  })

  describe('updateProjectInStore', () => {
    it('should add new project', () => {
      const project = createTestProject('1', 'New Project')

      updateProjectInStore(project)

      expect(get(projects)).toHaveLength(1)
      expect(get(projects)[0]).toEqual(project)
    })

    it('should update existing project', () => {
      const project = createTestProject('1', 'Original')
      setProjects([project])

      const updated = { ...project, name: 'Updated' }
      updateProjectInStore(updated)

      expect(get(projects)).toHaveLength(1)
      expect(get(projects)[0].name).toBe('Updated')
    })

    it('should preserve other projects', () => {
      setProjects([createTestProject('1', 'Project 1'), createTestProject('2', 'Project 2')])

      const updated = createTestProject('1', 'Updated 1')
      updateProjectInStore(updated)

      expect(get(projects)).toHaveLength(2)
      expect(get(projects)[0].name).toBe('Updated 1')
      expect(get(projects)[1].name).toBe('Project 2')
    })
  })

  describe('removeProjectFromStore', () => {
    it('should remove project by ID', () => {
      setProjects([createTestProject('1', 'Project 1'), createTestProject('2', 'Project 2')])

      removeProjectFromStore('1')

      expect(get(projects)).toHaveLength(1)
      expect(get(projects)[0].id).toBe('2')
    })

    it('should do nothing if project not found', () => {
      setProjects([createTestProject('1', 'Project 1')])

      removeProjectFromStore('non-existent')

      expect(get(projects)).toHaveLength(1)
    })
  })
})
