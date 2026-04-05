/**
 * ToolsManifest — describes the external binaries (pandoc, typst) that
 * Lighthouse can download on demand to power high-quality export.
 *
 * The manifest JSON file lives in a dedicated GitHub release so its URL is
 * stable across plugin releases. When the plugin needs a new binary version
 * we publish a new tools release and bump TOOLS_MANIFEST_URL here.
 *
 * Manifest schema (tools-manifest.json):
 * {
 *   "pandoc": { "version": "3.6.4", "platforms": { "darwin-arm64": { "url": "...", "sha256": "...", "size": 34567890 } } },
 *   "typst":  { "version": "0.13.1", "platforms": { ... } }
 * }
 *
 * Each binary is a gzipped executable hosted as a GitHub release asset.
 */

/** URL of the manifest JSON in our GitHub releases */
export const TOOLS_MANIFEST_URL =
  'https://github.com/benjamincassidy/obsidian-lighthouse/releases/download/tools-v1/tools-manifest.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToolName = 'pandoc' | 'typst'

/** Entry for one platform binary in the manifest */
export interface PlatformEntry {
  /** Direct download URL for the gzipped binary */
  url: string
  /** Lowercase hex SHA-256 of the raw (decompressed) binary */
  sha256: string
  /** Byte size of the decompressed binary (for progress display) */
  size: number
}

/** Manifest entry for one tool */
export interface ToolEntry {
  version: string
  /** Key is `${process.platform}-${process.arch}`, e.g. "darwin-arm64" */
  platforms: Partial<Record<string, PlatformEntry>>
}

/** The full tools manifest */
export interface ToolsManifest {
  pandoc: ToolEntry
  typst: ToolEntry
}

// ---------------------------------------------------------------------------
// Platform key helper
// ---------------------------------------------------------------------------

/** Returns the platform key for the current machine, or null if unsupported */
export function currentPlatformKey(): string | null {
  const p = process.platform // 'darwin' | 'linux' | 'win32'
  const a = process.arch // 'x64' | 'arm64' | 'ia32'

  // Normalise: only the combinations we actually publish
  if (p === 'darwin' && (a === 'x64' || a === 'arm64')) return `${p}-${a}`
  if (p === 'linux' && (a === 'x64' || a === 'arm64')) return `${p}-${a}`
  if (p === 'win32' && a === 'x64') return `${p}-${a}`

  return null
}

/** Returns the executable filename for a tool on the current platform */
export function binaryFilename(tool: ToolName): string {
  return process.platform === 'win32' ? `${tool}.exe` : tool
}
