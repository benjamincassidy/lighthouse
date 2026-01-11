import type { App } from 'obsidian'

export interface ZenModeState {
  isActive: boolean
  previousState: {
    leftSidebarVisible: boolean
    rightSidebarVisible: boolean
    statusBarVisible: boolean
  }
}

export class ZenMode {
  private app: App
  private state: ZenModeState

  constructor(app: App) {
    this.app = app
    this.state = {
      isActive: false,
      previousState: {
        leftSidebarVisible: true,
        rightSidebarVisible: true,
        statusBarVisible: true,
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

    // Store current state
    this.state.previousState = {
      leftSidebarVisible: !workspace.leftSplit.collapsed,
      rightSidebarVisible: !workspace.rightSplit.collapsed,
      statusBarVisible: this.isStatusBarVisible(),
    }

    // Hide left sidebar
    if (!workspace.leftSplit.collapsed) {
      workspace.leftSplit.collapse()
    }

    // Hide right sidebar
    if (!workspace.rightSplit.collapsed) {
      workspace.rightSplit.collapse()
    }

    // Hide status bar
    this.hideStatusBar()

    // Hide ribbon
    this.hideRibbon()

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

    // Restore status bar
    if (this.state.previousState.statusBarVisible) {
      this.showStatusBar()
    }

    // Show ribbon
    this.showRibbon()

    this.state.isActive = false

    // Trigger workspace layout change event
    workspace.trigger('layout-change')
  }

  private isStatusBarVisible(): boolean {
    const statusBar = document.querySelector('.status-bar')
    return statusBar ? statusBar.checkVisibility() : true
  }

  private hideStatusBar(): void {
    const statusBar = document.querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.style.display = 'none'
    }
  }

  private showStatusBar(): void {
    const statusBar = document.querySelector('.status-bar') as HTMLElement
    if (statusBar) {
      statusBar.style.display = ''
    }
  }

  private hideRibbon(): void {
    const ribbon = document.querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.style.display = 'none'
    }
  }

  private showRibbon(): void {
    const ribbon = document.querySelector('.workspace-ribbon') as HTMLElement
    if (ribbon) {
      ribbon.style.display = ''
    }
  }
}
