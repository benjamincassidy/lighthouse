import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import { createRequire } from 'module'
import { tmpdir } from 'os'
import { join } from 'path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * Spike for GitHub issue #77 — proves that Typst can compile a document to
 * PDF entirely in-process via WebAssembly, with no native binary, no
 * subprocess, and no network call.
 *
 * Deliberately NOT wired into any production export path yet — this is
 * investigation, not implementation.
 *
 * @myriaddreamin/typst-ts-node-compiler (the "Node" package upstream
 * recommends) is a native N-API addon with platform-specific `.node`
 * binaries — not usable from a single bundled plugin `main.js`. This test
 * uses the browser/WASM packages instead (typst.ts + typst-ts-web-compiler),
 * which is what Obsidian's Electron renderer can actually load in-process.
 *
 * IMPORTANT gotcha #1: `TypstCompilerDriver.init()` silently overrides an
 * empty `beforeBuild: []` — if it doesn't see a font loader, it injects its
 * own default one that fetches ~17 font files from cdn.jsdelivr.net
 * (LibertinusSerif, DejaVuSansMono, NewCM10/NewCMMath). This is a hard
 * requirement, not an optional default: with NO font loader at all,
 * compilation throws ("no font loader found"). Every call site must
 * explicitly pass `loadFonts([], { assets: false })` to disable that default
 * before it's safe to assume this is offline/network-free. This directly
 * informs issue #79 (per-theme font bundling) — it's required for
 * Typst-WASM to compile at all, not just a nice-to-have for custom fonts.
 *
 * IMPORTANT gotcha #2: `require.resolve()` (used below to locate the .wasm
 * file for THIS test's purposes) only works because this repo's node_modules
 * happens to be reachable from the test file's location. It will NOT work in
 * the real shipped plugin — Obsidian installs a plugin as a single main.js
 * at `.obsidian/plugins/lighthouse/`, with no node_modules anywhere nearby.
 * Confirmed by bundling a probe through the project's real esbuild config
 * and running the output from a directory with no node_modules: the
 * require.resolve() approach throws MODULE_NOT_FOUND, while a plain
 * plugin-directory-relative path (matching BinaryManager.ts's existing
 * getPluginBaseDir()/path.join() pattern) works correctly. The second test
 * below proves and locks in the correct pattern.
 *
 * Also measured directly inside a real Obsidian.app renderer process (via
 * the same Playwright+CDP approach scripts/screenshots/capture.mjs uses):
 * compiled successfully in ~88ms, identical to plain Node/vitest — no CSP or
 * nodeIntegration issues specific to Obsidian's Electron renderer. The
 * resulting esbuild bundle for the JS glue code (excluding the .wasm binary
 * itself, which is correctly never inlined) is ~250KB.
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

  it('resolves the wasm binary via a plugin-relative path, not module resolution', async () => {
    // Copies the wasm file to an isolated temp dir with no node_modules
    // nearby, simulating .obsidian/plugins/lighthouse/ in a real install —
    // proving require.resolve() is NOT how the real integration (#78) can
    // locate this file; a plugin-directory-relative path is required.
    const require = createRequire(import.meta.url)
    const sourceWasmPath =
      require.resolve('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
    const isolatedDir = mkdtempSync(join(tmpdir(), 'lighthouse-wasm-test-'))
    const isolatedWasmPath = join(isolatedDir, 'typst-compiler.wasm')
    writeFileSync(isolatedWasmPath, readFileSync(sourceWasmPath))

    try {
      const { createTypstCompiler, loadFonts } = await import('@myriaddreamin/typst.ts')
      const wasmBinary = readFileSync(isolatedWasmPath) // plain path.join-style lookup, no require.resolve

      const compiler = createTypstCompiler()
      await compiler.init({
        getModule: () => wasmBinary,
        beforeBuild: [loadFonts([], { assets: false })],
      })
      compiler.addSource(
        '/main.typ',
        '= Hello\n\nCompiled from an isolated, node_modules-free path.',
      )
      const { result } = await compiler.compile({ mainFilePath: '/main.typ', format: 1 })

      expect(result).toBeDefined()
      const header = Buffer.from(result!.slice(0, 5)).toString('utf8')
      expect(header).toBe('%PDF-')
      expect(fetchCalls).toEqual([])
    } finally {
      rmSync(isolatedDir, { recursive: true, force: true })
    }
  }, 20_000)
})
