import type { LighthouseSettings } from '@/types/settings'

import type { App } from 'obsidian'

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
}
