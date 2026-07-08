import { Platform } from 'obsidian'

interface WindowWithRequire {
  require?: (moduleName: string) => unknown
}

function getDesktopRequire(): (moduleName: string) => unknown {
  if (!Platform.isDesktop) {
    throw new Error('This feature is only available on desktop.')
  }

  const win: WindowWithRequire | null = activeDocument.defaultView
  if (!win?.require) {
    throw new Error('Node.js runtime is not available in this environment.')
  }

  return win.require
}

export function requireDesktopModule<T>(moduleName: string): T {
  const req = getDesktopRequire()
  return req(moduleName) as T
}

export function getDesktopProcess(): {
  platform: string
  arch: string
  env: Record<string, string | undefined>
} {
  const processModule = requireDesktopModule<typeof import('process')>('process')
  return {
    platform: processModule.platform,
    arch: processModule.arch,
    env: processModule.env,
  }
}
