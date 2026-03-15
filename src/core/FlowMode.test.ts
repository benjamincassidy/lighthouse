import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildTypographyVars, FlowMode } from '@/core/FlowMode'
import { DEFAULT_SETTINGS } from '@/types/settings'
import type { LighthouseSettings } from '@/types/settings'

import type { App } from 'obsidian'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApp(workspaceOverrides: Record<string, unknown> = {}) {
  const mockRef = { id: 'mock-event-ref' }
  return {
    workspace: {
      leftSplit: { collapsed: false, collapse: vi.fn(), expand: vi.fn() },
      rightSplit: { collapsed: false, collapse: vi.fn(), expand: vi.fn() },
      on: vi.fn().mockReturnValue(mockRef),
      off: vi.fn(),
      offref: vi.fn(),
      trigger: vi.fn(),
      ...workspaceOverrides,
    },
  }
}

function makeSettings(overrides: Partial<LighthouseSettings> = {}): LighthouseSettings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

// ---------------------------------------------------------------------------
// buildTypographyVars (pure function — no DOM required)
// ---------------------------------------------------------------------------

describe('buildTypographyVars', () => {
  it('returns empty object when no overrides are configured', () => {
    const vars = buildTypographyVars(makeSettings())
    expect(vars).toEqual({})
  })

  it('includes --lh-flow-font when flowFont is set', () => {
    const vars = buildTypographyVars(makeSettings({ flowFont: 'Georgia, serif' }))
    expect(vars['--lh-flow-font']).toBe('Georgia, serif')
  })

  it('includes --lh-flow-line-height when flowLineHeight is non-zero', () => {
    const vars = buildTypographyVars(makeSettings({ flowLineHeight: 1.8 }))
    expect(vars['--lh-flow-line-height']).toBe('1.8')
  })

  it('includes --lh-flow-line-width when flowLineWidth is non-zero', () => {
    const vars = buildTypographyVars(makeSettings({ flowLineWidth: 700 }))
    expect(vars['--lh-flow-line-width']).toBe('700px')
  })

  it('includes all three properties when all are configured', () => {
    const vars = buildTypographyVars(
      makeSettings({ flowFont: 'Georgia', flowLineHeight: 1.8, flowLineWidth: 700 }),
    )
    expect(vars['--lh-flow-font']).toBe('Georgia')
    expect(vars['--lh-flow-line-height']).toBe('1.8')
    expect(vars['--lh-flow-line-width']).toBe('700px')
  })

  it('omits --lh-flow-line-height when flowLineHeight is 0', () => {
    const vars = buildTypographyVars(makeSettings({ flowLineHeight: 0 }))
    expect(vars).not.toHaveProperty('--lh-flow-line-height')
  })

  it('omits --lh-flow-line-width when flowLineWidth is 0', () => {
    const vars = buildTypographyVars(makeSettings({ flowLineWidth: 0 }))
    expect(vars).not.toHaveProperty('--lh-flow-line-width')
  })
})

// ---------------------------------------------------------------------------
// Typography injection / cleanup (DOM mocked via vi.stubGlobal)
// ---------------------------------------------------------------------------

describe('FlowMode — typography overrides', () => {
  let mockApp: ReturnType<typeof makeApp>
  let flowMode: FlowMode
  let mockBodyStyle: {
    setProperty: ReturnType<typeof vi.fn>
    removeProperty: ReturnType<typeof vi.fn>
  }
  let mockBodyClassList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
  let mockDoc: {
    body: { style: typeof mockBodyStyle; classList: typeof mockBodyClassList }
    querySelector: ReturnType<typeof vi.fn>
    querySelectorAll: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockBodyStyle = { setProperty: vi.fn(), removeProperty: vi.fn() }
    mockBodyClassList = { add: vi.fn(), remove: vi.fn() }
    mockDoc = {
      body: { style: mockBodyStyle, classList: mockBodyClassList },
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue({ forEach: vi.fn() }),
    }

    vi.stubGlobal('document', mockDoc)

    mockApp = makeApp()
    flowMode = new FlowMode(mockApp as unknown as App, () =>
      makeSettings({ flowFont: 'Georgia', flowLineHeight: 1.8, flowLineWidth: 700 }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets CSS custom properties on document.body', () => {
    ;(flowMode as unknown as { applyTypographyOverrides: () => void }).applyTypographyOverrides()

    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-flow-font', 'Georgia')
    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-flow-line-height', '1.8')
    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-flow-line-width', '700px')
  })

  it('adds lh-flow-active class to body', () => {
    ;(flowMode as unknown as { applyTypographyOverrides: () => void }).applyTypographyOverrides()

    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-flow-active')
  })

  it('does not call setProperty when no typography overrides are configured', () => {
    const noOverrideMode = new FlowMode(mockApp as unknown as App, () => makeSettings())

    ;(
      noOverrideMode as unknown as { applyTypographyOverrides: () => void }
    ).applyTypographyOverrides()

    expect(mockBodyStyle.setProperty).not.toHaveBeenCalled()
    // lh-flow-active is still added (scoping class is always applied)
    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-flow-active')
  })

  it('removes all CSS custom properties on removeTypographyOverrides', () => {
    ;(flowMode as unknown as { removeTypographyOverrides: () => void }).removeTypographyOverrides()

    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-flow-font')
    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-flow-line-height')
    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-flow-line-width')
  })

  it('removes lh-flow-active class from body on removeTypographyOverrides', () => {
    ;(flowMode as unknown as { removeTypographyOverrides: () => void }).removeTypographyOverrides()

    expect(mockBodyClassList.remove).toHaveBeenCalledWith('lh-flow-active')
  })
})

// ---------------------------------------------------------------------------
// Typewriter scroll — event registration
// ---------------------------------------------------------------------------

describe('FlowMode — typewriter scroll', () => {
  let mockApp: ReturnType<typeof makeApp>
  let flowMode: FlowMode

  beforeEach(() => {
    vi.stubGlobal('document', {
      body: {
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
        classList: { add: vi.fn(), remove: vi.fn() },
      },
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue({ forEach: vi.fn() }),
    })

    mockApp = makeApp()
    flowMode = new FlowMode(mockApp as unknown as App, () => makeSettings())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers an editor-change workspace listener on enableTypewriterScroll', () => {
    ;(flowMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()

    expect(mockApp.workspace.on).toHaveBeenCalledWith('editor-change', expect.any(Function))
  })

  it('calls offref with the stored EventRef on disableTypewriterScroll', () => {
    const mockRef = { id: 'mock-event-ref' }
    mockApp.workspace.on.mockReturnValue(
      mockRef as unknown as ReturnType<typeof mockApp.workspace.on>,
    )
    ;(flowMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()
    ;(flowMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()

    expect(mockApp.workspace.offref).toHaveBeenCalledWith(mockRef)
  })

  it('does not call offref if typewriter scroll was never enabled', () => {
    ;(flowMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()
    expect(mockApp.workspace.offref).not.toHaveBeenCalled()
  })

  it('clears the ref after disabling so a second disable is a no-op', () => {
    ;(flowMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()
    ;(flowMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()
    ;(flowMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()

    expect(mockApp.workspace.offref).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Focus mode — CSS class application
// ---------------------------------------------------------------------------

describe('FlowMode — focus mode', () => {
  let mockApp: ReturnType<typeof makeApp>
  let flowMode: FlowMode
  let mockBodyClassList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockBodyClassList = { add: vi.fn(), remove: vi.fn() }

    vi.stubGlobal('document', {
      body: {
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
        classList: mockBodyClassList,
      },
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue({ forEach: vi.fn() }),
    })

    mockApp = makeApp()
    flowMode = new FlowMode(mockApp as unknown as App, () => makeSettings())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds lh-focus-paragraph class to body for paragraph mode', () => {
    ;(flowMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-focus-paragraph')
  })

  it('adds lh-focus-sentence class to body for sentence mode', () => {
    ;(flowMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('sentence')
    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-focus-sentence')
  })

  it('removes the active focus class from body on disableFocusMode', () => {
    ;(flowMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    ;(flowMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    expect(mockBodyClassList.remove).toHaveBeenCalledWith('lh-focus-paragraph')
  })

  it('does nothing on disableFocusMode when no focus mode was active', () => {
    ;(flowMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    expect(mockBodyClassList.remove).not.toHaveBeenCalled()
  })

  it('clears activeFocusClass after disabling so a second disable is a no-op', () => {
    ;(flowMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    ;(flowMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    ;(flowMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    // classList.remove should only be called once
    expect(mockBodyClassList.remove).toHaveBeenCalledTimes(1)
  })
})
