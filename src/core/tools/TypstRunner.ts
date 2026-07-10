/**
 * TypstRunner — compiles a Markdown document to PDF using Typst compiled to
 * WebAssembly, entirely in-process. No native binary, no subprocess, no
 * runtime download, no network call — see GitHub issue #77 for the spike
 * that established this is possible and #78 for this integration.
 *
 * Pipeline:
 *   1. Lazily load the WASM compiler (only on first actual PDF export —
 *      never at plugin startup) from a plugin-relative path, NOT via
 *      require.resolve()/module resolution, which doesn't work once main.js
 *      is installed with no node_modules nearby (confirmed in #77).
 *   2. Add the compiled Markdown as a virtual source file.
 *   3. Either use a caller-supplied .typ template, or generate a minimal
 *      built-in shim that imports cmarker and sets basic page geometry.
 *   4. Compile in-process; write the resulting PDF bytes to outputPath.
 *
 * The cmarker package (https://typst.app/universe/package/cmarker/) parses
 * CommonMark Markdown directly inside Typst — no pandoc required for PDF.
 * Typst's WASM compiler has no filesystem access, so both cmarker and a
 * default font are bundled locally (see vendor/typst/) and loaded into an
 * in-memory access model — there is no equivalent of the native CLI's
 * on-first-use download from packages.typst.org; a package registry must be
 * supplied explicitly or compilation fails outright.
 *
 * Custom templates receive the content path via sys.inputs.content:
 *
 *   #import "@preview/cmarker:0.1.8"
 *   // ... page setup, fonts, etc.
 *   #cmarker.render(read(sys.inputs.content))
 *
 * BibTeX bibliographies can be added by the template or via a raw-typst
 * comment in the Markdown:
 *
 *   <!--raw-typst #bibliography("refs.bib") -->
 */

import { Platform } from 'obsidian'

import type LighthousePlugin from '@/main'
import { requireDesktopModule } from '@/utils/desktopNode'

import { getPluginBaseDir } from './BinaryManager'

import type { MemoryAccessModel as MemoryAccessModelType } from '@myriaddreamin/typst.ts'
import type {
  PackageRegistry,
  PackageResolveContext,
  PackageSpec,
} from '@myriaddreamin/typst.ts/dist/esm/internal.types.mjs'
import type { BeforeBuildFn } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs'

export const CMARKER_VERSION = '0.1.8'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TypstPdfOptions {
  /** Absolute path where the output PDF should be written */
  outputPath: string
  /**
   * Absolute path of a .typ template file. The template is compiled as the
   * entry point and must call:
   *   #cmarker.render(read(sys.inputs.content))
   * to render the document body.
   *
   * When omitted, a minimal built-in shim is used.
   */
  template?: string
  /**
   * Typst paper size string, e.g. "us-letter", "a4", "us-trade", "a5".
   * Only used when no template is provided. Default: "us-letter".
   */
  paperSize?: string
  /**
   * Absolute path to a bibliography file (.bib, .yml, .yaml, .json).
   * When provided, citations in the markdown will be resolved against this file.
   */
  bibliography?: string
  /**
   * Absolute path to a CSL (Citation Style Language) file for formatting citations.
   * Requires bibliography to be set. Common styles: APA, Chicago, MLA, etc.
   */
  citationStyle?: string
  /** Include a table of contents at the start of the document (default: false) */
  tableOfContents?: boolean
  /** Insert page breaks before top-level headings (default: false) */
  chapterPageBreaks?: boolean
}

// ---------------------------------------------------------------------------
// TypstRunner
// ---------------------------------------------------------------------------

export class TypstRunner {
  constructor(private plugin: LighthousePlugin) {}

  async toPdf(markdownContent: string, opts: TypstPdfOptions): Promise<void> {
    if (!Platform.isDesktop) {
      throw new Error('PDF export is only available on desktop.')
    }

    const fs = requireDesktopModule<typeof import('fs')>('fs')
    const path = requireDesktopModule<typeof import('path')>('path')

    // Lazy-loaded — only reached on an actual PDF export, never at plugin
    // startup. Keeps Obsidian's load time unaffected by this dependency.
    const typstTs = await import('@myriaddreamin/typst.ts')
    // withAccessModel/withPackageRegistry aren't part of the package's
    // public type exports, but the runtime functions live here (confirmed
    // empirically, see #78) — this submodule has no .d.mts of its own
    // reachable from the public export map, hence the untyped import.
    const { withAccessModel, withPackageRegistry } =
      (await import('@myriaddreamin/typst.ts/dist/esm/options.init.mjs')) as {
        withAccessModel: (am: MemoryAccessModelType) => BeforeBuildFn
        withPackageRegistry: (registry: PackageRegistry) => BeforeBuildFn
      }

    const baseDir = getPluginBaseDir(this.plugin)
    const wasmBinary = fs.readFileSync(path.join(baseDir, 'typst-compiler.wasm'))
    const accessModel = buildAccessModel(typstTs.MemoryAccessModel, baseDir, fs, path)
    const packageRegistry = buildCmarkerRegistry(baseDir, fs, path, accessModel)
    const fontBuffers = readBundledFonts(baseDir, fs, path)

    const compiler = typstTs.createTypstCompiler()
    await compiler.init({
      getModule: () => wasmBinary,
      beforeBuild: [
        typstTs.loadFonts(fontBuffers, { assets: false }),
        withAccessModel(accessModel),
        withPackageRegistry(packageRegistry),
      ],
    })

    compiler.addSource('/content.md', markdownContent)

    const inputs: Record<string, string> = { content: '/content.md' }
    if (opts.bibliography) {
      const bibExt = path.extname(opts.bibliography) || '.bib'
      compiler.addSource(`/bibliography${bibExt}`, fs.readFileSync(opts.bibliography, 'utf8'))
      inputs.bibliography = `/bibliography${bibExt}`
    }

    const entryContent = opts.template
      ? fs.readFileSync(opts.template, 'utf8')
      : buildShim(
          opts.paperSize ?? 'us-letter',
          !!opts.bibliography,
          !!opts.tableOfContents,
          !!opts.chapterPageBreaks,
          opts.citationStyle,
        )
    compiler.addSource('/entry.typ', entryContent)

    const { result, diagnostics } = await compiler.compile({
      mainFilePath: '/entry.typ',
      format: 1, // CompileFormatEnum.pdf — not exported as a runtime value, see #77/#78
      diagnostics: 'full',
      inputs,
    })

    const errors = (diagnostics ?? []).filter((d) => d.severity === 'error')
    if (!result || errors.length > 0) {
      const message = errors.map((d) => d.message).join('\n') || 'unknown error'
      throw new Error(`Typst compilation failed: ${message}`)
    }

    fs.writeFileSync(opts.outputPath, result)
  }
}

// ---------------------------------------------------------------------------
// Bundled asset loading — cmarker package + default font, both hard
// requirements for compilation to succeed at all (see #77's findings).
// ---------------------------------------------------------------------------

const CMARKER_PACKAGE_DIR = '/@memory/local/packages/preview/cmarker/0.1.8'

function buildAccessModel(
  MemoryAccessModel: typeof MemoryAccessModelType,
  baseDir: string,
  fs: typeof import('fs'),
  path: typeof import('path'),
): MemoryAccessModelType {
  const am = new MemoryAccessModel()
  const cmarkerDir = path.join(baseDir, 'typst-cmarker')
  const now = new Date()
  for (const file of ['lib.typ', 'plugin.wasm', 'typst.toml']) {
    am.insertFile(
      `${CMARKER_PACKAGE_DIR}/${file}`,
      fs.readFileSync(path.join(cmarkerDir, file)),
      now,
    )
  }
  return am
}

function buildCmarkerRegistry(
  baseDir: string,
  fs: typeof import('fs'),
  path: typeof import('path'),
  accessModel: MemoryAccessModelType,
): PackageRegistry {
  // Populating the access model happens once, eagerly, in buildAccessModel —
  // this registry just needs to tell the compiler where to find it.
  void baseDir
  void fs
  void path
  void accessModel
  return {
    resolve(spec: PackageSpec, _context: PackageResolveContext) {
      if (spec.namespace === 'preview' && spec.name === 'cmarker' && spec.version === '0.1.8') {
        return CMARKER_PACKAGE_DIR
      }
      return undefined
    },
  }
}

function readBundledFonts(
  baseDir: string,
  fs: typeof import('fs'),
  path: typeof import('path'),
): Uint8Array[] {
  const fontsDir = path.join(baseDir, 'typst-fonts')
  const files = fs.readdirSync(fontsDir).filter((f: string) => /\.(ttf|otf)$/i.test(f))
  return files.map((f: string) => fs.readFileSync(path.join(fontsDir, f)))
}

// ---------------------------------------------------------------------------
// Built-in minimal shim (used when no template is provided)
// ---------------------------------------------------------------------------

function buildShim(
  paperSize: string,
  hasBibliography: boolean,
  hasTableOfContents: boolean,
  chapterPageBreaks: boolean = false,
  citationStyle?: string,
): string {
  let shim = `#import "@preview/cmarker:${CMARKER_VERSION}"

#set page(paper: "${paperSize}")
#set text(font: "Liberation Serif", size: 11pt)
#set par(leading: 0.75em)

`

  // Insert page breaks before top-level headings (chapters)
  if (chapterPageBreaks) {
    shim += `#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  it
}

`
  }

  if (hasTableOfContents) {
    shim += `#outline(depth: 3, indent: 2em)
#pagebreak()

`
  }

  shim += `#cmarker.render(read(sys.inputs.content))
`

  if (hasBibliography) {
    if (citationStyle) {
      shim += `\n#bibliography(sys.inputs.bibliography, style: "${citationStyle}")
`
    } else {
      shim += `\n#bibliography(sys.inputs.bibliography)
`
    }
  }

  return shim
}
