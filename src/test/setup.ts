// Test setup file for Vitest
// Obsidian API is mocked via alias in vitest.config.mts

// The `environment: 'node'` test env has no `window` global. Production code
// calls `window.setTimeout`/`window.clearTimeout` explicitly (per Obsidian's
// guidance, to avoid ambiguity with Node's differently-typed timer globals).
// Aliasing `window` to `globalThis` here lets those calls resolve to Node's
// real timer functions in tests, without every test needing its own stub.
if (typeof globalThis.window === 'undefined') {
  ;(globalThis as unknown as { window: typeof globalThis }).window = globalThis
}
