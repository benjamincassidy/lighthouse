import type { LighthouseSettings } from '@/types/settings'

import type { App, Editor, EventRef } from 'obsidian'

/**
 * Returns CSS custom property key→value pairs for zen typography overrides.
 * Only includes properties that have non-default values.
 * These are applied to `document.body` so scoped CSS in styles.css can use them.
 */
export function buildTypographyVars(settings: LighthouseSettings): Record<string, string> {
  const vars: Record<string, string> = {}
  if (settings.zenFont) vars['--lh-zen-font'] = settings.zenFont
  if (settings.zenLineHeight) vars['--lh-zen-line-height'] = String(settings.zenLineHeight)
  if (settings.zenLineWidth) vars['--lh-zen-line-width'] = `${settings.zenLineWidth}px`
  return vars
}

export interface ZenModeState {
  isActive: boolean
  previousState: {
    leftSidebarVisible: boolean
    rightSidebarVisible: boolean
    statusBarVisible: boolean
    ribbonVisible: boolean
  }
}

export class ZenMode {
  private app: App
  private getSettings: () => LighthouseSettings
  private state: ZenModeState
  /** EventRef returned by workspace.on('editor-change') for typewriter scroll */
  private typewriterScrollRef: EventRef | null = null
  /** CSS class currently applied to .cm-editor elements for focus mode */
  private activeFocusClass: string | null = null

  constructor(app: App, getSettings: () => LighthouseSettings) {
    this.app = app
    this.getSettings = getSettings
    this.state = {
      isActive: false,
      previousState: {
        leftSidebarVisible: true,
        rightSidebarVisible: true,
        statusBarVisible: true,
        ribbonVisible: true,
      },
    }
  }

  isZenModeActive(): boolean {
    return this.state.isActive
  }

  toggleZenMode(): void {
    if (this.state.isActive) {
      this.exitZenMode()
    } else {
      this.enterZenMode()
    }
  }

  enterZenMode(): void {
    if (this.state.isActive) return

    const { workspace } = this.app
    const settings = this.getSettings()

    // Store current state
    this.state.previousState = {
      leftSidebarVisible: !workspace.leftSplit.collapsed,
      rightSidebarVisible: !workspace.rightSplit.collapsed,
      statusBarVisible: this.isStatusBarVisible(),
      ribbonVisible: this.isRibbonVisible(),
    }

    // Hide left sidebar
    if (!workspace.leftSplit.collapsed) {
      workspace.leftSplit.collapse()
    }

    // Hide right sidebar
    if (!workspace.rightSplit.collapsed) {
      workspace.rightSplit.collapse()
    }

    // Conditionally hide status bar
    if (settings.zenModeHideStatusBar) {
      this.hideStatusBar()
    }

    // Conditionally hide ribbon
    if (settings.zenModeHideRibbon) {
      this.hideRibbon()
    }

    // Hide tabs
    this.hideTabs()

    // Hide sidebar toggles
    this.hideSidebarToggles()

    // Hide breadcrumbs and navigation
    this.hideNavigation()

    // Typewriter scroll
    if (settings.zenTypewriterScroll) {
      this.enableTypewriterScroll()
    }

    // Paragraph / sentence focus dimming
    if (settings.zenFocusMode !== 'none') {
      this.enableFocusMode(settings.zenFocusMode)
    }

    // Typography overrides
    this.applyTypographyOverrides()

    this.state.isActive = true

    // Trigger workspace layout change event
    workspace.trigger('layout-change')
  }

  exitZenMode(): void {
    if (!this.state.isActive) return

    const { workspace } = this.app

    // Restore left sidebar
    if (this.state.previousState.leftSidebarVisible && workspace.leftSplit.collapsed) {
      workspace.leftSplit.expand()
    }

    // Restore right sidebar
    if (this.state.previousState.rightSidebarVisible && workspace.rightSplit.collapsed) {
      workspace.rightSplit.expand()
    }

    // Restore status bar only if it was hidden by zen mode
    if (this.state.previousState.statusBarVisible) {
      this.showStatusBar()
    }

    // Restore ribbon only if it was hidden by zen mode
    if (this.state.previousState.ribbonVisible) {
      this.showRibbon()
    }

    // Show tabs
    this.showTabs()

    // Show sidebar toggles
    this.showSidebarToggles()

    // Show breadcrumbs and navigation
    this.showNavigation()

    // Clean up focus & typography
    this.disableTypewriterScroll()
    this.disableFocusMode()
    this.removeTypographyOverrides()

    this.state.isActive = false

    // Trigger workspace layout change event
    workspace.trigger('layout-change')
  }

  private isStatusBarVisible(): boolean {
    const statusBar = document.querySelector('.status-bar')
    return statusBar ? statusBar.checkVisibility() : true
  }

  private isRibbonVisible(): boolean {
    const ribbon = document.querySelector('.workspace-ribbon')
    return ribbon ? !ribbon.hasClass('lighthouse-hidden') : true
  }

  private hideStatusBar(): void {
    const statusBar = document.querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.addClass('lighthouse-hidden')
    }
  }

  private showStatusBar(): void {
    const statusBar = document.querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.removeClass('lighthouse-hidden')
    }
  }

  private hideRibbon(): void {
    const ribbon = document.querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.addClass('lighthouse-hidden')
    }
  }

  private showRibbon(): void {
    const ribbon = document.querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.removeClass('lighthouse-hidden')
    }
  }

  private hideTabs(): void {
    const tabs = document.querySelector('.workspace-tabs') as HTMLElement
    if (tabs) {
      tabs.addClass('lighthouse-zen-dim')
    }
  }

  private showTabs(): void {
    const tabs = document.querySelector('.workspace-tabs') as HTMLElement
    if (tabs) {
      tabs.removeClass('lighthouse-zen-dim')
    }
  }

  private hideSidebarToggles(): void {
    const leftToggle = document.querySelector('.sidebar-toggle-button.mod-left') as HTMLElement
    const rightToggle = document.querySelector('.sidebar-toggle-button.mod-right') as HTMLElement
    if (leftToggle) {
      leftToggle.addClass('lighthouse-hidden')
    }
    if (rightToggle) {
      rightToggle.addClass('lighthouse-hidden')
    }
  }

  private showSidebarToggles(): void {
    const leftToggle = document.querySelector('.sidebar-toggle-button.mod-left') as HTMLElement
    const rightToggle = document.querySelector('.sidebar-toggle-button.mod-right') as HTMLElement
    if (leftToggle) {
      leftToggle.removeClass('lighthouse-hidden')
    }
    if (rightToggle) {
      rightToggle.removeClass('lighthouse-hidden')
    }
  }

  private hideNavigation(): void {
    const viewHeader = document.querySelector('.view-header') as HTMLElement
    if (viewHeader) {
      viewHeader.addClass('lighthouse-hidden')
    }
  }

  private showNavigation(): void {
    const viewHeader = document.querySelector('.view-header') as HTMLElement
    if (viewHeader) {
      viewHeader.removeClass('lighthouse-hidden')
    }
  }

  // ---------------------------------------------------------------------------
  // Typewriter scroll
  // ---------------------------------------------------------------------------

  enableTypewriterScroll(): void {
    this.typewriterScrollRef = this.app.workspace.on('editor-change', (editor: Editor) => {
      const cursor = editor.getCursor()
      editor.scrollIntoView({ from: cursor, to: cursor }, true)
    })
  }

  disableTypewriterScroll(): void {
    if (this.typewriterScrollRef) {
      this.app.workspace.offref(this.typewriterScrollRef)
      this.typewriterScrollRef = null
    }
  }

  // ---------------------------------------------------------------------------
  // Focus mode (paragraph / sentence dim)
  // ---------------------------------------------------------------------------

  enableFocusMode(mode: 'paragraph' | 'sentence'): void {
    // Clear any previously applied class first
    this.disableFocusMode()
    const cssClass = mode === 'sentence' ? 'lh-focus-sentence' : 'lh-focus-paragraph'
    document.querySelectorAll<HTMLElement>('.cm-editor').forEach((el) => {
      el.classList.add(cssClass)
    })
    this.activeFocusClass = cssClass
  }

  disableFocusMode(): void {
    if (this.activeFocusClass) {
      document.querySelectorAll<HTMLElement>(`.${this.activeFocusClass}`).forEach((el) => {
        el.classList.remove(this.activeFocusClass!)
      })
      this.activeFocusClass = null
    }
  }

  // ---------------------------------------------------------------------------
  // Typography overrides (sets CSS custom properties + body class;
  // scoped CSS rules in styles.css consume them)
  // ---------------------------------------------------------------------------

  applyTypographyOverrides(): void {
    const vars = buildTypographyVars(this.getSettings())
    for (const [prop, value] of Object.entries(vars)) {
      document.body.style.setProperty(prop, value)
    }
    document.body.classList.add('lh-zen-active')
  }

  removeTypographyOverrides(): void {
    document.body.style.removeProperty('--lh-zen-font')
    document.body.style.removeProperty('--lh-zen-line-height')
    document.body.style.removeProperty('--lh-zen-line-width')
    document.body.classList.remove('lh-zen-active')
  }
}
