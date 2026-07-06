import type { LighthouseSettings } from '@/types/settings'

import type { App, Editor, EventRef } from 'obsidian'

/**
 * Returns CSS custom property key→value pairs for flow typography overrides.
 * Only includes properties that have non-default values.
 * These are applied to the active document body so scoped CSS in styles.css
 * can also work in popout windows.
 */
export function buildTypographyVars(settings: LighthouseSettings): Record<string, string> {
  const vars: Record<string, string> = {}
  if (settings.flowFont) vars['--lh-flow-font'] = settings.flowFont
  if (settings.flowLineHeight) vars['--lh-flow-line-height'] = String(settings.flowLineHeight)
  if (settings.flowLineWidth) vars['--lh-flow-line-width'] = `${settings.flowLineWidth}px`
  return vars
}

export interface FlowModeState {
  isActive: boolean
  previousState: {
    leftSidebarVisible: boolean
    rightSidebarVisible: boolean
    statusBarVisible: boolean
    ribbonVisible: boolean
  }
}

export class FlowMode {
  private app: App
  private getSettings: () => LighthouseSettings
  private state: FlowModeState
  /** EventRef returned by workspace.on('editor-change') for typewriter scroll */
  private typewriterScrollRef: EventRef | null = null

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

  private getActiveDocument(): Document {
    const workspace = this.app.workspace as unknown as {
      activeDocument?: Document
      containerEl?: HTMLElement
    }
    return workspace.activeDocument ?? workspace.containerEl?.ownerDocument ?? document
  }

  isFlowModeActive(): boolean {
    return this.state.isActive
  }

  toggleFlowMode(): void {
    if (this.state.isActive) {
      this.exitFlowMode()
    } else {
      this.enterFlowMode()
    }
  }

  enterFlowMode(): void {
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
    if (settings.flowModeHideStatusBar) {
      this.hideStatusBar()
    }

    // Conditionally hide ribbon
    if (settings.flowModeHideRibbon) {
      this.hideRibbon()
    }

    // Hide tabs
    this.hideTabs()

    // Hide sidebar toggles
    this.hideSidebarToggles()

    // Hide breadcrumbs and navigation
    this.hideNavigation()

    // Typewriter scroll
    if (settings.flowTypewriterScroll) {
      this.enableTypewriterScroll()
    }

    // Typography overrides
    this.applyTypographyOverrides()

    this.state.isActive = true

    // Trigger workspace layout change event
    workspace.trigger('layout-change')
  }

  exitFlowMode(): void {
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

    // Clean up typography
    this.disableTypewriterScroll()
    this.removeTypographyOverrides()

    this.state.isActive = false

    // Trigger workspace layout change event
    workspace.trigger('layout-change')
  }

  private isStatusBarVisible(): boolean {
    const statusBar = this.getActiveDocument().querySelector('.status-bar')
    return statusBar ? statusBar.checkVisibility() : true
  }

  private isRibbonVisible(): boolean {
    const ribbon = this.getActiveDocument().querySelector('.workspace-ribbon')
    return ribbon ? !ribbon.hasClass('lighthouse-hidden') : true
  }

  private hideStatusBar(): void {
    const statusBar = this.getActiveDocument().querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.addClass('lighthouse-hidden')
    }
  }

  private showStatusBar(): void {
    const statusBar = this.getActiveDocument().querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.removeClass('lighthouse-hidden')
    }
  }

  private hideRibbon(): void {
    const ribbon = this.getActiveDocument().querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.addClass('lighthouse-hidden')
    }
  }

  private showRibbon(): void {
    const ribbon = this.getActiveDocument().querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.removeClass('lighthouse-hidden')
    }
  }

  private hideTabs(): void {
    const tabs = this.getActiveDocument().querySelector('.workspace-tabs') as HTMLElement
    if (tabs) {
      tabs.addClass('lighthouse-zen-dim')
    }
  }

  private showTabs(): void {
    const tabs = this.getActiveDocument().querySelector('.workspace-tabs') as HTMLElement
    if (tabs) {
      tabs.removeClass('lighthouse-zen-dim')
    }
  }

  private hideSidebarToggles(): void {
    const leftToggle = this.getActiveDocument().querySelector(
      '.sidebar-toggle-button.mod-left',
    ) as HTMLElement
    const rightToggle = this.getActiveDocument().querySelector(
      '.sidebar-toggle-button.mod-right',
    ) as HTMLElement
    if (leftToggle) {
      leftToggle.addClass('lighthouse-hidden')
    }
    if (rightToggle) {
      rightToggle.addClass('lighthouse-hidden')
    }
  }

  private showSidebarToggles(): void {
    const leftToggle = this.getActiveDocument().querySelector(
      '.sidebar-toggle-button.mod-left',
    ) as HTMLElement
    const rightToggle = this.getActiveDocument().querySelector(
      '.sidebar-toggle-button.mod-right',
    ) as HTMLElement
    if (leftToggle) {
      leftToggle.removeClass('lighthouse-hidden')
    }
    if (rightToggle) {
      rightToggle.removeClass('lighthouse-hidden')
    }
  }

  private hideNavigation(): void {
    const viewHeader = this.getActiveDocument().querySelector('.view-header') as HTMLElement
    if (viewHeader) {
      viewHeader.addClass('lighthouse-hidden')
    }
  }

  private showNavigation(): void {
    const viewHeader = this.getActiveDocument().querySelector('.view-header') as HTMLElement
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
  // Typography overrides (sets CSS custom properties + body class;
  // scoped CSS rules in styles.css consume them)
  // ---------------------------------------------------------------------------

  applyTypographyOverrides(): void {
    const vars = buildTypographyVars(this.getSettings())
    const body = this.getActiveDocument().body
    for (const [prop, value] of Object.entries(vars)) {
      body.style.setProperty(prop, value)
    }
    body.classList.add('lh-flow-active')
  }

  removeTypographyOverrides(): void {
    const body = this.getActiveDocument().body
    body.style.removeProperty('--lh-flow-font')
    body.style.removeProperty('--lh-flow-line-height')
    body.style.removeProperty('--lh-flow-line-width')
    body.classList.remove('lh-flow-active')
  }
}
