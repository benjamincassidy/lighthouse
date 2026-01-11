// Mock implementation of Obsidian API for testing

export class Plugin {
  app: App
  manifest: PluginManifest

  constructor(app: App, manifest: PluginManifest) {
    this.app = app
    this.manifest = manifest
  }

  async loadData() {
    return {}
  }

  async saveData(_data: unknown) {
    return
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
  constructor(message: string, timeout?: number) {
    console.log(`Notice (${timeout}ms):`, message)
  }
}

export interface App {
  workspace: unknown
  vault: unknown
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
