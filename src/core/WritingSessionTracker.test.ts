import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Project } from '@/types/types'

import { WritingSessionTracker } from './WritingSessionTracker'

const TODAY = new Date().toISOString().split('T')[0]

function makePlugin() {
  return {
    projectManager: {
      updateProject: vi.fn().mockResolvedValue(undefined),
    },
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test',
    rootPath: 'test',
    contentFolders: [],
    sourceFolders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    todayWordCountBaseline: 100,
    todayWordCountDate: TODAY,
    ...overrides,
  }
}

describe('WritingSessionTracker', () => {
  let tracker: WritingSessionTracker
  let plugin: ReturnType<typeof makePlugin>

  beforeEach(() => {
    vi.clearAllMocks()
    plugin = makePlugin()
    tracker = new WritingSessionTracker(plugin as never)
  })

  describe('initial state', () => {
    it('is not initialized before initSession', () => {
      expect(tracker.isInitialized()).toBe(false)
    })

    it('returns 0 for all deltas when not initialized', () => {
      expect(tracker.getSessionDelta(500)).toBe(0)
      expect(tracker.getTodayDelta(500)).toBe(0)
    })
  })

  describe('initSession', () => {
    it('marks as initialized after call', async () => {
      await tracker.initSession(makeProject(), 300)
      expect(tracker.isInitialized()).toBe(true)
    })

    it('sets session baseline to currentWordCount', async () => {
      await tracker.initSession(makeProject(), 300)
      expect(tracker.getSessionDelta(300)).toBe(0)
      expect(tracker.getSessionDelta(350)).toBe(50)
    })

    it('loads existing today baseline when same day', async () => {
      // project has baseline=100, today=TODAY; starting at 300
      await tracker.initSession(makeProject(), 300)
      // today delta = 300 - 100 = 200
      expect(tracker.getTodayDelta(300)).toBe(200)
    })

    it('does not call updateProject when same day', async () => {
      await tracker.initSession(makeProject(), 300)
      expect(plugin.projectManager.updateProject).not.toHaveBeenCalled()
    })

    it('seeds a new today baseline on a new day', async () => {
      const oldProject = makeProject({
        todayWordCountDate: '2020-01-01',
        todayWordCountBaseline: 50,
      })
      await tracker.initSession(oldProject, 300)
      expect(tracker.getTodayDelta(300)).toBe(0)
      expect(plugin.projectManager.updateProject).toHaveBeenCalledWith(
        expect.objectContaining({ todayWordCountBaseline: 300, todayWordCountDate: TODAY }),
      )
    })

    it('tracks the project id', async () => {
      await tracker.initSession(makeProject(), 300)
      expect(tracker.isTrackingProject('proj-1')).toBe(true)
      expect(tracker.isTrackingProject('other')).toBe(false)
    })
  })

  describe('getSessionDelta', () => {
    beforeEach(async () => {
      await tracker.initSession(makeProject(), 300)
    })

    it('returns 0 at baseline', () => {
      expect(tracker.getSessionDelta(300)).toBe(0)
    })

    it('returns positive delta after writing', () => {
      expect(tracker.getSessionDelta(450)).toBe(150)
    })

    it('returns 0 when word count drops below baseline', () => {
      expect(tracker.getSessionDelta(250)).toBe(0)
    })

    it('adjusts baseline down on deletion, then tracks subsequent writing', () => {
      tracker.getSessionDelta(200) // drops below baseline; baseline slides to 200
      expect(tracker.getSessionDelta(230)).toBe(30)
    })
  })

  describe('getTodayDelta', () => {
    it('returns delta above today baseline', async () => {
      await tracker.initSession(makeProject({ todayWordCountBaseline: 100 }), 300)
      expect(tracker.getTodayDelta(500)).toBe(400) // 500 - 100
    })

    it('returns 0 when at or below today baseline', async () => {
      await tracker.initSession(makeProject(), 300) // baseline=100
      expect(tracker.getTodayDelta(50)).toBe(0)
    })
  })

  describe('snapshotToday', () => {
    it('does not call updateProject when data is already current', async () => {
      const project = makeProject()
      await tracker.initSession(project, 300)
      vi.clearAllMocks()
      await tracker.snapshotToday(project)
      expect(plugin.projectManager.updateProject).not.toHaveBeenCalled()
    })

    it('calls updateProject when persisted data is stale', async () => {
      // Old project date forces a new baseline on init; project object still has old values
      const staleProject = makeProject({ todayWordCountDate: '2020-01-01' })
      await tracker.initSession(staleProject, 300)
      vi.clearAllMocks()
      // staleProject.todayWordCountDate is still '2020-01-01' ≠ today in state
      await tracker.snapshotToday(staleProject)
      expect(plugin.projectManager.updateProject).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('clears initialized state', async () => {
      await tracker.initSession(makeProject(), 300)
      tracker.reset()
      expect(tracker.isInitialized()).toBe(false)
      expect(tracker.getSessionDelta(500)).toBe(0)
      expect(tracker.isTrackingProject('proj-1')).toBe(false)
    })
  })
})
