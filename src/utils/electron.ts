/**
 * Electron utilities for file dialogs
 * These are available in Obsidian's desktop app
 */

interface ElectronDialog {
  showOpenDialogSync(options: {
    title: string
    properties: string[]
    filters?: Array<{ name: string; extensions: string[] }>
  }): string[] | undefined
}

interface ElectronRemote {
  dialog: ElectronDialog
}

interface ElectronModule {
  remote?: ElectronRemote
}

interface WindowWithRequire {
  require?: (module: string) => unknown
}

/**
 * Get Electron's dialog API (available in Obsidian desktop)
 * Returns null if not available (e.g., mobile or web)
 */
export function getElectronDialog(): ElectronDialog | null {
  try {
    // Access window via globalThis to avoid no-undef
    const win =
      typeof globalThis !== 'undefined' ? (globalThis as unknown as WindowWithRequire) : null
    if (!win) return null

    // Dynamic require to avoid bundling issues
    const electronRequire = win.require
    if (!electronRequire) return null

    // Try @electron/remote first (newer)
    try {
      const remote = electronRequire('@electron/remote') as { dialog: ElectronDialog }
      if (remote?.dialog) return remote.dialog
    } catch {
      // Fall through to try electron.remote
    }

    // Try electron.remote (older)
    const electron = electronRequire('electron') as ElectronModule
    if (electron?.remote?.dialog) return electron.remote.dialog

    return null
  } catch {
    return null
  }
}
