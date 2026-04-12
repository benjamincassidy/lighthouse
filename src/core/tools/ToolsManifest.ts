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

/* eslint-disable no-undef */
// Desktop-only code: requires process global

// ---------------------------------------------------------------------------
// Manifest URL configuration
// ---------------------------------------------------------------------------

/**
 * Plugin version injected at build time by esbuild.
 * This is replaced with the actual version from manifest.json during the build.
 */
declare const __LIGHTHOUSE_VERSION__: string

/**
 * Default manifest URL - points to the latest plugin release's manifest.
 * The version is injected at build time by esbuild.
 *
 * Format: https://github.com/owner/repo/releases/download/<version>/tools-manifest.json
 */
function getVersionSpecificManifestUrl(): string | null {
  // Check if version was injected (will be a string like "1.1.0")
  const version = typeof __LIGHTHOUSE_VERSION__ !== 'undefined' ? __LIGHTHOUSE_VERSION__ : null

  if (version) {
    return `https://github.com/benjamincassidy/obsidian-lighthouse/releases/download/${version}/tools-manifest.json`
  }

  return null
}

/**
 * Fallback manifest URL - used if the version-specific manifest isn't available yet.
 * Points to the tools-v1 release which has manually curated binaries.
 */
const FALLBACK_MANIFEST_URL =
  'https://github.com/benjamincassidy/obsidian-lighthouse/releases/download/tools-v1/tools-manifest.json'

/**
 * Get the manifest URL to use for downloading tool binaries.
 * Tries the version-specific URL first, falls back to the tools-v1 release.
 */
export function getToolsManifestUrl(): string {
  return getVersionSpecificManifestUrl() || FALLBACK_MANIFEST_URL
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getToolsManifestUrl() instead
 */
export const TOOLS_MANIFEST_URL = getToolsManifestUrl()

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

// ---------------------------------------------------------------------------
// Style asset types
// ---------------------------------------------------------------------------

/** Built-in style IDs that can have downloadable export templates */
export type StyleName = 'novel-trade' | 'manuscript-standard' | 'academic-a4'

/** Format-specific asset entry for one style (platform-agnostic) */
export interface StyleAssetEntry {
  /** Direct download URL for the gzipped asset */
  url: string
  /** Lowercase hex SHA-256 of the raw (decompressed) file */
  sha256: string
  /** Byte size of the decompressed file */
  size: number
}

/** Template assets available for one style */
export interface StyleEntry {
  /** Reference .docx for pandoc --reference-doc */
  docx?: StyleAssetEntry
  /** Typst template .typ for pandoc --template */
  typst?: StyleAssetEntry
}

// ---------------------------------------------------------------------------
// Full manifest
// ---------------------------------------------------------------------------

/** The full tools manifest */
export interface ToolsManifest {
  pandoc: ToolEntry
  typst: ToolEntry
  /** Per-style template assets; omitted or empty if none published yet */
  styles: Partial<Record<StyleName, StyleEntry>>
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
