import { readFileSync } from 'fs'
import { createRequire } from 'module'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * Spike for GitHub issue #77 — proves that Typst can compile a document to
 * PDF entirely in-process via WebAssembly, with no native binary, no
 * subprocess, and no network call.
 *
 * Deliberately NOT wired into any production export path yet — this is
 * investigation, not implementation. See the issue for the open questions
 * this doesn't yet answer (real bundle size in the actual plugin build, load
 * time inside Obsidian specifically).
 *
 * @myriaddreamin/typst-ts-node-compiler (the "Node" package upstream
 * recommends) is a native N-API addon with platform-specific `.node`
 * binaries — not usable from a single bundled plugin `main.js`. This test
 * uses the browser/WASM packages instead (typst.ts + typst-ts-web-compiler),
 * which is what Obsidian's Electron renderer can actually load in-process.
 *
 * IMPORTANT gotcha this test locks in: `TypstCompilerDriver.init()` silently
 * overrides an empty `beforeBuild: []` — if it doesn't see a font loader, it
 * injects its own default one that fetches ~17 font files from
 * cdn.jsdelivr.net (LibertinusSerif, DejaVuSansMono, NewCM10/NewCMMath). This
 * is a hard requirement, not an optional default: with NO font loader at
 * all, compilation throws ("no font loader found"). Every call site must
 * explicitly pass `loadFonts([], { assets: false })` to disable that default
 * before it's safe to assume this is offline/network-free. This directly
 * informs issue #79 (per-theme font bundling) — it's required for
 * Typst-WASM to compile at all, not just a nice-to-have for custom fonts.
 */

/** Safely describes fetch()'s first argument for an assertion message, without relying on RequestInfo's default (unsafe) toString(). */
function describeFetchArg(arg: RequestInfo | URL): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof URL) return arg.href
  return arg.url
}

describe('Typst WASM spike (issue #77)', () => {
  let originalFetch: typeof fetch
  let fetchCalls: string[]

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchCalls = []
    // Any network call in these tests is a bug — Typst-WASM must be usable
    // fully offline once fonts are handled explicitly.
    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      const requestUrl = describeFetchArg(args[0])
      fetchCalls.push(requestUrl)
      throw new Error(`Unexpected network call in offline test: ${requestUrl}`)
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  async function loadWasmCompiler() {
    const { createTypstCompiler, loadFonts } = await import('@myriaddreamin/typst.ts')

    const require = createRequire(import.meta.url)
    const wasmPath =
      require.resolve('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
    const wasmBinary = readFileSync(wasmPath)

    const compiler = createTypstCompiler()
    await compiler.init({
      getModule: () => wasmBinary,
      // { assets: false } satisfies the driver's own hasDisableAssets check,
      // preventing it from pushing its own default remote-font loader.
      beforeBuild: [loadFonts([], { assets: false })],
    })
    return compiler
  }

  it('compiles a trivial document to valid PDF bytes with no native binary and no network call', async () => {
    const compiler = await loadWasmCompiler()
    compiler.addSource('/main.typ', '= Hello\n\nThis is a test document.')

    const { result, diagnostics } = await compiler.compile({
      mainFilePath: '/main.typ',
      format: 1, // CompileFormatEnum.pdf — not exported as a runtime value, see compiler.d.mts
    })

    expect(diagnostics).toBeUndefined()
    expect(result).toBeDefined()
    expect(result!.length).toBeGreaterThan(0)

    const header = Buffer.from(result!.slice(0, 5)).toString('utf8')
    expect(header).toBe('%PDF-')
    expect(fetchCalls).toEqual([])
  }, 20_000) // WASM init is ~500-700ms; generous timeout for slower CI runners
})
