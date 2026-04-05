/**
 * BinaryManager — downloads, verifies, and manages the Pandoc and Typst
 * binaries that Lighthouse uses for high-quality document export.
 *
 * Binaries live at: {vaultRoot}/.obsidian/plugins/lighthouse/bin/
 * Metadata lives at: .../bin/installed.json
 *
 * Download pipeline:
 *   1. Fetch tools-manifest.json from GitHub releases
 *   2. Pick the entry for the current platform
 *   3. Stream-download the gzipped binary
 *   4. Decompress with Node.js zlib
 *   5. Verify SHA-256 against the manifest
 *   6. Write to disk + chmod 0o755 on macOS/Linux
 *   7. Update installed.json
 */

import { createHash } from 'crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { gunzip } from 'zlib'

import type LighthousePlugin from '@/main'

import {
  binaryFilename,
  currentPlatformKey,
  TOOLS_MANIFEST_URL,
  type ToolName,
  type ToolsManifest,
} from './ToolsManifest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstalledTools {
  pandoc?: string // installed version string
  typst?: string
}

export interface DownloadProgress {
  /** 0–1, or -1 if content-length is unknown */
  fraction: number
  /** Bytes received so far */
  received: number
  /** Total bytes expected (decompressed), or 0 if unknown */
  total: number
}

export type ProgressCallback = (p: DownloadProgress) => void

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function getPluginBaseDir(plugin: LighthousePlugin): string {
  // FileSystemAdapter exposes the vault root via getBasePath()
  // Config dir is typically ".obsidian"
  const adapter = plugin.app.vault.adapter as unknown as { basePath: string }
  return join(adapter.basePath, plugin.app.vault.configDir, 'plugins', plugin.manifest.id)
}

export function getBinDir(plugin: LighthousePlugin): string {
  return join(getPluginBaseDir(plugin), 'bin')
}

export function getBinPath(tool: ToolName, plugin: LighthousePlugin): string {
  return join(getBinDir(plugin), binaryFilename(tool))
}

function getInstalledPath(plugin: LighthousePlugin): string {
  return join(getBinDir(plugin), 'installed.json')
}

// ---------------------------------------------------------------------------
// installed.json helpers
// ---------------------------------------------------------------------------

function readInstalled(plugin: LighthousePlugin): InstalledTools {
  try {
    const raw = readFileSync(getInstalledPath(plugin), 'utf8')
    return JSON.parse(raw) as InstalledTools
  } catch {
    return {}
  }
}

function writeInstalled(plugin: LighthousePlugin, data: InstalledTools): void {
  const binDir = getBinDir(plugin)
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })
  writeFileSync(getInstalledPath(plugin), JSON.stringify(data, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class BinaryManager {
  private plugin: LighthousePlugin
  private manifestCache: ToolsManifest | null = null

  constructor(plugin: LighthousePlugin) {
    this.plugin = plugin
  }

  /** Returns the version string of an installed tool, or null if not installed */
  getInstalledVersion(tool: ToolName): string | null {
    const installed = readInstalled(this.plugin)
    return installed[tool] ?? null
  }

  /** True if the binary file exists on disk */
  isBinaryPresent(tool: ToolName): boolean {
    return existsSync(getBinPath(tool, this.plugin))
  }

  /** True if the tool is installed and the binary is present */
  isReady(tool: ToolName): boolean {
    return this.isBinaryPresent(tool) && this.getInstalledVersion(tool) !== null
  }

  /** Fetch and cache the tools manifest from GitHub */
  async fetchManifest(): Promise<ToolsManifest> {
    if (this.manifestCache) return this.manifestCache

    const resp = await fetch(TOOLS_MANIFEST_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch tools manifest (HTTP ${resp.status}): ${TOOLS_MANIFEST_URL}`)
    }
    this.manifestCache = (await resp.json()) as ToolsManifest
    return this.manifestCache
  }

  /**
   * Download, verify, and install a binary.
   * Calls onProgress repeatedly during the download.
   * Throws if the platform is unsupported or the checksum fails.
   */
  async install(tool: ToolName, onProgress?: ProgressCallback): Promise<void> {
    const platformKey = currentPlatformKey()
    if (!platformKey) {
      throw new Error(
        `Unsupported platform: ${process.platform}-${process.arch}. ` +
          'Lighthouse export tools are available for macOS (x64/arm64), ' +
          'Linux (x64/arm64), and Windows (x64).',
      )
    }

    const manifest = await this.fetchManifest()
    const toolEntry = manifest[tool]
    const platformEntry = toolEntry.platforms[platformKey]

    if (!platformEntry) {
      throw new Error(`No binary available for ${tool} on ${platformKey}.`)
    }

    // Ensure bin dir exists
    const binDir = getBinDir(this.plugin)
    if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })

    // Stream-download the gzipped binary
    const compressedBytes = await this.downloadWithProgress(
      platformEntry.url,
      platformEntry.size,
      onProgress,
    )

    // Decompress
    const rawBytes = await gunzipAsync(compressedBytes)

    // Verify SHA-256
    const actual = createHash('sha256').update(rawBytes).digest('hex')
    if (actual.toLowerCase() !== platformEntry.sha256.toLowerCase()) {
      throw new Error(
        `SHA-256 mismatch for ${tool}!\n` +
          `  Expected: ${platformEntry.sha256}\n` +
          `  Got:      ${actual}\n` +
          'The download may be corrupted. Please try again.',
      )
    }

    // Write binary to disk
    const binPath = getBinPath(tool, this.plugin)
    writeFileSync(binPath, rawBytes)

    // Make executable on macOS / Linux
    if (process.platform !== 'win32') {
      chmodSync(binPath, 0o755)
    }

    // Record the installed version
    const installed = readInstalled(this.plugin)
    installed[tool] = toolEntry.version
    writeInstalled(this.plugin, installed)
  }

  /**
   * Remove an installed binary and its version record.
   * Safe to call even if the tool is not installed.
   */
  uninstall(tool: ToolName): void {
    const binPath = getBinPath(tool, this.plugin)
    if (existsSync(binPath)) {
      // Use fs.unlinkSync — Node.js is available in Electron
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs')
      fs.unlinkSync(binPath)
    }
    const installed = readInstalled(this.plugin)
    delete installed[tool]
    writeInstalled(this.plugin, installed)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async downloadWithProgress(
    url: string,
    expectedDecompressedSize: number,
    onProgress?: ProgressCallback,
  ): Promise<Buffer> {
    const resp = await fetch(url)
    if (!resp.ok) {
      throw new Error(`Download failed (HTTP ${resp.status}): ${url}`)
    }

    if (!resp.body) {
      throw new Error('Response body is null — cannot stream download.')
    }

    const reader = resp.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0

    // We report progress in terms of decompressed size so the number makes
    // intuitive sense to the user ("downloading 34 MB").
    // The compressed download will be smaller but we don't know that size
    // upfront (Content-Length reflects the compressed transfer size which
    // doesn't map cleanly). Using the manifest's decompressed size is clearer.
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length

      if (onProgress) {
        onProgress({
          fraction:
            expectedDecompressedSize > 0 ? Math.min(received / expectedDecompressedSize, 0.99) : -1,
          received,
          total: expectedDecompressedSize,
        })
      }
    }

    if (onProgress) {
      onProgress({ fraction: 1, received, total: expectedDecompressedSize })
    }

    return Buffer.concat(chunks)
  }
}

// ---------------------------------------------------------------------------
// Promisified gunzip
// ---------------------------------------------------------------------------

function gunzipAsync(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    gunzip(input, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
