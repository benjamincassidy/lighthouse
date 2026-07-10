// Test setup file for Vitest
// Obsidian API is mocked via alias in vitest.config.mts

import { createRequire } from 'module'

// The `environment: 'node'` test env has no `window` global. Production code
// calls `window.setTimeout`/`window.clearTimeout` explicitly (per Obsidian's
// guidance, to avoid ambiguity with Node's differently-typed timer globals).
// Aliasing `window` to `globalThis` here lets those calls resolve to Node's
// real timer functions in tests, without every test needing its own stub.
if (typeof globalThis.window === 'undefined') {
  ;(globalThis as unknown as { window: typeof globalThis }).window = globalThis
}

// desktopNode.ts's requireDesktopModule() reads activeDocument.defaultView
// .require to access real Node modules from Obsidian's renderer process —
// polyfill it so tests can exercise any code path that goes through it
// (e.g. TypstRunner.ts) without every test needing its own stub.
if (typeof (globalThis as unknown as { activeDocument?: unknown }).activeDocument === 'undefined') {
  const testRequire = createRequire(import.meta.url)
  ;(
    globalThis as unknown as { activeDocument: { defaultView: { require: typeof require } } }
  ).activeDocument = {
    defaultView: { require: testRequire },
  }
}
