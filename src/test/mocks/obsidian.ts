// Mock implementation of Obsidian API for testing

export class Plugin {
  app: App
  manifest: PluginManifest

  constructor(app: App, manifest: PluginManifest) {
    this.app = app
    this.manifest = manifest
  }

  loadData() {
    return Promise.resolve({})
  }

  saveData(_data: unknown) {
    return Promise.resolve()
  }

  addCommand(_command: Command) {
    return
  }

  onload() {
    return
  }

  onunload() {
    return
  }
}

export class Notice {
  constructor(_message: string, _timeout?: number) {
    // Mock notice - intentionally silent in tests
  }
}

// Tests run under vitest's Node environment, which is functionally "desktop"
// from the plugin's perspective — no real Electron/mobile distinction to mock.
export const Platform = {
  isDesktop: true,
  isMobile: false,
  isMacOS: process.platform === 'darwin',
  isWin: process.platform === 'win32',
  isLinux: process.platform === 'linux',
}

export interface App {
  workspace: unknown
  vault: {
    configDir: string
    adapter: {
      exists: (path: string) => Promise<boolean>
      read: (path: string) => Promise<string>
      write: (path: string, data: string) => Promise<void>
    }
  }
}

export interface PluginManifest {
  id: string
  name: string
  version: string
}

export interface Command {
  id: string
  name: string
  callback?: () => void
  checkCallback?: (checking: boolean) => boolean | void
}
