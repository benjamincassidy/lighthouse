import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { createRequire } from 'module'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TypstRunner } from './TypstRunner'

import type { App, PluginManifest } from 'obsidian'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Integration test for the WASM-based TypstRunner (#78). Deliberately does
 * NOT depend on `npm run build` having already run (esbuild.config.mjs's
 * asset-copy step) — the pre-push hook runs `test` before `build`, so this
 * builds its own isolated "plugin directory" from the canonical asset
 * sources (node_modules + vendor/typst/) instead, matching the pattern
 * established in typstWasmSpike.test.ts.
 */
describe('TypstRunner (WASM)', () => {
  let pluginDir: string

  beforeEach(() => {
    pluginDir = mkdtempSync(join(tmpdir(), 'lighthouse-typst-test-'))
    mkdirSync(join(pluginDir, 'typst-cmarker'), { recursive: true })
    mkdirSync(join(pluginDir, 'typst-fonts'), { recursive: true })

    const require = createRequire(import.meta.url)
    const wasmSource =
      require.resolve('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
    writeFileSync(join(pluginDir, 'typst-compiler.wasm'), readFileSync(wasmSource))

    const cmarkerDir = join(__dirname, '..', '..', '..', 'vendor', 'typst', 'cmarker')
    for (const file of ['lib.typ', 'plugin.wasm', 'typst.toml']) {
      writeFileSync(join(pluginDir, 'typst-cmarker', file), readFileSync(join(cmarkerDir, file)))
    }

    const fontsDir = join(__dirname, '..', '..', '..', 'vendor', 'typst', 'fonts')
    writeFileSync(
      join(pluginDir, 'typst-fonts', 'LiberationSerif-Regular.ttf'),
      readFileSync(join(fontsDir, 'LiberationSerif-Regular.ttf')),
    )
  })

  afterEach(() => {
    rmSync(pluginDir, { recursive: true, force: true })
  })

  function makeFakePlugin() {
    const manifest = { id: 'lighthouse', name: 'Lighthouse', version: '0.0.0' } as PluginManifest
    const app = {
      // configDir is intentionally omitted — getPluginBaseDir() only falls
      // back to it when manifest.dir is falsy, and it's always truthy below.
      vault: {
        adapter: { basePath: pluginDir } as unknown,
      },
    } as unknown as App
    // manifest.dir must be truthy (getPluginBaseDir does `if (plugin.manifest.dir)`)
    // — '.' joined with pluginDir resolves back to pluginDir itself.
    return { app, manifest: { ...manifest, dir: '.' } } as unknown as import('@/main').default
  }

  it('compiles markdown to a valid PDF file with no template, entirely offline', async () => {
    const runner = new TypstRunner(makeFakePlugin())
    const outputPath = join(pluginDir, 'out.pdf')

    await runner.toPdf('# Chapter One\n\nSome **bold** prose for a real test.', {
      outputPath,
    })

    expect(existsSync(outputPath)).toBe(true)
    const bytes = readFileSync(outputPath)
    expect(bytes.length).toBeGreaterThan(0)
    expect(bytes.subarray(0, 5).toString('utf8')).toBe('%PDF-')
  }, 20_000)

  it('respects paperSize, tableOfContents, and chapterPageBreaks options', async () => {
    const runner = new TypstRunner(makeFakePlugin())
    const outputPath = join(pluginDir, 'out-options.pdf')

    await runner.toPdf('# One\n\nContent one.\n\n# Two\n\nContent two.', {
      outputPath,
      paperSize: 'a4',
      tableOfContents: true,
      chapterPageBreaks: true,
    })

    expect(existsSync(outputPath)).toBe(true)
    expect(readFileSync(outputPath).subarray(0, 5).toString('utf8')).toBe('%PDF-')
  }, 20_000)

  it('throws a descriptive error when compilation fails', async () => {
    const runner = new TypstRunner(makeFakePlugin())
    const outputPath = join(pluginDir, 'out-fail.pdf')

    // A template that references an undefined function — guaranteed compile error.
    await expect(
      runner.toPdf('irrelevant content', {
        outputPath,
        template: (() => {
          const templatePath = join(pluginDir, 'broken.typ')
          writeFileSync(templatePath, '#this-function-does-not-exist()')
          return templatePath
        })(),
      }),
    ).rejects.toThrow(/Typst compilation failed/)
  }, 20_000)
})
