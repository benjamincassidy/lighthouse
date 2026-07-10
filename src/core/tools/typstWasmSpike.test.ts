import { readFileSync } from 'fs'
import { createRequire } from 'module'

import { describe, expect, it } from 'vitest'

/**
 * Spike for GitHub issue #77 — proves that Typst can compile a document to
 * PDF entirely in-process via WebAssembly, with no native binary, no
 * subprocess, and no network call for the compiler itself.
 *
 * Deliberately NOT wired into any production export path yet — this is
 * investigation, not implementation. See the issue for the open questions
 * this doesn't yet answer (custom font injection, bundle size in the actual
 * plugin build, load time inside Obsidian specifically).
 *
 * @myriaddreamin/typst-ts-node-compiler (the "Node" package upstream
 * recommends) is a native N-API addon with platform-specific `.node`
 * binaries — not usable from a single bundled plugin `main.js`. This test
 * uses the browser/WASM packages instead (typst.ts + typst-ts-web-compiler),
 * which is what Obsidian's Electron renderer can actually load in-process.
 */
describe('Typst WASM spike (issue #77)', () => {
  it('compiles a trivial document to valid PDF bytes with no native binary', async () => {
    const { createTypstCompiler } = await import('@myriaddreamin/typst.ts')

    const require = createRequire(import.meta.url)
    const wasmPath =
      require.resolve('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
    const wasmBinary = readFileSync(wasmPath)

    const compiler = createTypstCompiler()
    await compiler.init({
      getModule: () => wasmBinary,
      beforeBuild: [],
    })

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
  }, 20_000) // WASM init is ~500-700ms; generous timeout for slower CI runners
})
