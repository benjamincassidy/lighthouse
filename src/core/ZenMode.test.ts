import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildTypographyVars, ZenMode } from '@/core/ZenMode'
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

  it('includes --lh-zen-font when zenFont is set', () => {
    const vars = buildTypographyVars(makeSettings({ zenFont: 'Georgia, serif' }))
    expect(vars['--lh-zen-font']).toBe('Georgia, serif')
  })

  it('includes --lh-zen-line-height when zenLineHeight is non-zero', () => {
    const vars = buildTypographyVars(makeSettings({ zenLineHeight: 1.8 }))
    expect(vars['--lh-zen-line-height']).toBe('1.8')
  })

  it('includes --lh-zen-line-width when zenLineWidth is non-zero', () => {
    const vars = buildTypographyVars(makeSettings({ zenLineWidth: 700 }))
    expect(vars['--lh-zen-line-width']).toBe('700px')
  })

  it('includes all three properties when all are configured', () => {
    const vars = buildTypographyVars(
      makeSettings({ zenFont: 'Georgia', zenLineHeight: 1.8, zenLineWidth: 700 }),
    )
    expect(vars['--lh-zen-font']).toBe('Georgia')
    expect(vars['--lh-zen-line-height']).toBe('1.8')
    expect(vars['--lh-zen-line-width']).toBe('700px')
  })

  it('omits --lh-zen-line-height when zenLineHeight is 0', () => {
    const vars = buildTypographyVars(makeSettings({ zenLineHeight: 0 }))
    expect(vars).not.toHaveProperty('--lh-zen-line-height')
  })

  it('omits --lh-zen-line-width when zenLineWidth is 0', () => {
    const vars = buildTypographyVars(makeSettings({ zenLineWidth: 0 }))
    expect(vars).not.toHaveProperty('--lh-zen-line-width')
  })
})

// ---------------------------------------------------------------------------
// Typography injection / cleanup (DOM mocked via vi.stubGlobal)
// ---------------------------------------------------------------------------

describe('ZenMode — typography overrides', () => {
  let mockApp: ReturnType<typeof makeApp>
  let zenMode: ZenMode
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
    zenMode = new ZenMode(mockApp as unknown as App, () =>
      makeSettings({ zenFont: 'Georgia', zenLineHeight: 1.8, zenLineWidth: 700 }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets CSS custom properties on document.body', () => {
    ;(zenMode as unknown as { applyTypographyOverrides: () => void }).applyTypographyOverrides()

    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-zen-font', 'Georgia')
    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-zen-line-height', '1.8')
    expect(mockBodyStyle.setProperty).toHaveBeenCalledWith('--lh-zen-line-width', '700px')
  })

  it('adds lh-zen-active class to body', () => {
    ;(zenMode as unknown as { applyTypographyOverrides: () => void }).applyTypographyOverrides()

    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-zen-active')
  })

  it('does not call setProperty when no typography overrides are configured', () => {
    const noOverrideMode = new ZenMode(mockApp as unknown as App, () => makeSettings())

    ;(
      noOverrideMode as unknown as { applyTypographyOverrides: () => void }
    ).applyTypographyOverrides()

    expect(mockBodyStyle.setProperty).not.toHaveBeenCalled()
    // lh-zen-active is still added (scoping class is always applied)
    expect(mockBodyClassList.add).toHaveBeenCalledWith('lh-zen-active')
  })

  it('removes all CSS custom properties on removeTypographyOverrides', () => {
    ;(zenMode as unknown as { removeTypographyOverrides: () => void }).removeTypographyOverrides()

    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-zen-font')
    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-zen-line-height')
    expect(mockBodyStyle.removeProperty).toHaveBeenCalledWith('--lh-zen-line-width')
  })

  it('removes lh-zen-active class from body on removeTypographyOverrides', () => {
    ;(zenMode as unknown as { removeTypographyOverrides: () => void }).removeTypographyOverrides()

    expect(mockBodyClassList.remove).toHaveBeenCalledWith('lh-zen-active')
  })
})

// ---------------------------------------------------------------------------
// Typewriter scroll — event registration
// ---------------------------------------------------------------------------

describe('ZenMode — typewriter scroll', () => {
  let mockApp: ReturnType<typeof makeApp>
  let zenMode: ZenMode

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
    zenMode = new ZenMode(mockApp as unknown as App, () => makeSettings())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers an editor-change workspace listener on enableTypewriterScroll', () => {
    ;(zenMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()

    expect(mockApp.workspace.on).toHaveBeenCalledWith('editor-change', expect.any(Function))
  })

  it('calls offref with the stored EventRef on disableTypewriterScroll', () => {
    const mockRef = { id: 'mock-event-ref' }
    mockApp.workspace.on.mockReturnValue(
      mockRef as unknown as ReturnType<typeof mockApp.workspace.on>,
    )
    ;(zenMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()
    ;(zenMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()

    expect(mockApp.workspace.offref).toHaveBeenCalledWith(mockRef)
  })

  it('does not call offref if typewriter scroll was never enabled', () => {
    ;(zenMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()
    expect(mockApp.workspace.offref).not.toHaveBeenCalled()
  })

  it('clears the ref after disabling so a second disable is a no-op', () => {
    ;(zenMode as unknown as { enableTypewriterScroll: () => void }).enableTypewriterScroll()
    ;(zenMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()
    ;(zenMode as unknown as { disableTypewriterScroll: () => void }).disableTypewriterScroll()

    expect(mockApp.workspace.offref).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Focus mode — CSS class application
// ---------------------------------------------------------------------------

describe('ZenMode — focus mode', () => {
  let mockApp: ReturnType<typeof makeApp>
  let zenMode: ZenMode
  let mockEditorEl: {
    classList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
  }
  let mockQuerSelectorAll: ReturnType<typeof vi.fn>
  beforeEach(() => {
    mockEditorEl = { classList: { add: vi.fn(), remove: vi.fn() } }

    mockQuerSelectorAll = vi.fn().mockImplementation((selector: string) => {
      if (
        selector === '.cm-editor' ||
        selector === '.lh-focus-paragraph' ||
        selector === '.lh-focus-sentence'
      ) {
        return { forEach: (fn: (el: unknown) => void) => fn(mockEditorEl) }
      }
      return { forEach: vi.fn() }
    })

    vi.stubGlobal('document', {
      body: {
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
        classList: { add: vi.fn(), remove: vi.fn() },
      },
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: mockQuerSelectorAll,
    })

    mockApp = makeApp()
    zenMode = new ZenMode(mockApp as unknown as App, () => makeSettings())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds lh-focus-paragraph class for paragraph mode', () => {
    ;(zenMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    expect(mockEditorEl.classList.add).toHaveBeenCalledWith('lh-focus-paragraph')
  })

  it('adds lh-focus-sentence class for sentence mode', () => {
    ;(zenMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('sentence')
    expect(mockEditorEl.classList.add).toHaveBeenCalledWith('lh-focus-sentence')
  })

  it('removes the active focus class on disableFocusMode', () => {
    ;(zenMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    ;(zenMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    expect(mockEditorEl.classList.remove).toHaveBeenCalledWith('lh-focus-paragraph')
  })

  it('does nothing on disableFocusMode when no focus mode was active', () => {
    ;(zenMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    expect(mockEditorEl.classList.remove).not.toHaveBeenCalled()
  })

  it('clears activeFocusClass after disabling so a second disable is a no-op', () => {
    ;(zenMode as unknown as { enableFocusMode: (m: string) => void }).enableFocusMode('paragraph')
    ;(zenMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    ;(zenMode as unknown as { disableFocusMode: () => void }).disableFocusMode()
    // classList.remove should only be called once
    expect(mockEditorEl.classList.remove).toHaveBeenCalledTimes(1)
  })
})
