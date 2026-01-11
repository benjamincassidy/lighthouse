import { describe, it, expect, beforeEach } from 'vitest'

import { Project } from '@/types/types'
import { generateUUID, normalizeVaultPath, validateProject } from '@/utils/validation'

describe('validation utilities', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID()
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      expect(uuid1).not.toBe(uuid2)
    })
  })

  describe('normalizeVaultPath', () => {
    it('should remove leading slashes', () => {
      expect(normalizeVaultPath('/path/to/folder')).toBe('path/to/folder')
    })

    it('should remove trailing slashes', () => {
      expect(normalizeVaultPath('path/to/folder/')).toBe('path/to/folder')
    })

    it('should remove both leading and trailing slashes', () => {
      expect(normalizeVaultPath('/path/to/folder/')).toBe('path/to/folder')
    })

    it('should handle multiple slashes', () => {
      expect(normalizeVaultPath('///path/to/folder///')).toBe('path/to/folder')
    })

    it('should handle empty string', () => {
      expect(normalizeVaultPath('')).toBe('')
    })
  })

  describe('validateProject', () => {
    let validProject: Project

    beforeEach(() => {
      validProject = {
        id: generateUUID(),
        name: 'Test Project',
        rootPath: 'projects/test',
        contentFolders: ['content'],
        sourceFolders: ['research'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    it('should validate a valid project', () => {
      const errors = validateProject(validProject)
      expect(errors).toHaveLength(0)
    })

    it('should require project ID', () => {
      const errors = validateProject({ ...validProject, id: '' })
      expect(errors).toContain('Project ID is required and must be a non-empty string')
    })

    it('should require project name', () => {
      const errors = validateProject({ ...validProject, name: '' })
      expect(errors).toContain('Project name is required and must be a non-empty string')
    })

    it('should require root path', () => {
      const errors = validateProject({ ...validProject, rootPath: '' })
      expect(errors).toContain('Project root path is required')
    })

    it('should require content folders to be an array', () => {
      const errors = validateProject({ ...validProject, contentFolders: 'not-an-array' as any })
      expect(errors).toContain('Content folders must be an array')
    })

    it('should require source folders to be an array', () => {
      const errors = validateProject({ ...validProject, sourceFolders: 'not-an-array' as any })
      expect(errors).toContain('Source folders must be an array')
    })

    it('should validate word count goal is a number', () => {
      const errors = validateProject({ ...validProject, wordCountGoal: 'not-a-number' as any })
      expect(errors).toContain('Word count goal must be a number')
    })

    it('should validate word count goal is positive', () => {
      const errors = validateProject({ ...validProject, wordCountGoal: -100 })
      expect(errors).toContain('Word count goal must be a positive integer')
    })

    it('should validate word count goal is an integer', () => {
      const errors = validateProject({ ...validProject, wordCountGoal: 100.5 })
      expect(errors).toContain('Word count goal must be a positive integer')
    })

    it('should allow optional fields to be undefined', () => {
      const errors = validateProject({
        id: validProject.id,
        name: validProject.name,
        rootPath: validProject.rootPath,
        contentFolders: [],
        sourceFolders: [],
      })
      expect(errors).toHaveLength(0)
    })
  })
})
