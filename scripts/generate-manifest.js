#!/usr/bin/env node
/**
 * Generate tools-manifest.json for binaries bundled with the release.
 *
 * Usage: node scripts/generate-manifest.js <version> <base-url>
 *
 * Example:
 *   node scripts/generate-manifest.js 1.1.0 https://github.com/owner/repo/releases/download/1.1.0
 *
 * This script:
 * 1. Reads all .gz files from dist/binaries/
 * 2. Decompresses each to compute SHA-256 and size
 * 3. Generates tools-manifest.json with download URLs pointing to the release
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const zlib = require('zlib')

const BINARIES_DIR = path.join(__dirname, '../dist/binaries')
const OUTPUT_PATH = path.join(__dirname, '../dist/tools-manifest.json')

// Platform mappings
const PLATFORMS = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'win32-x64': 'win32-x64',
}

/**
 * Decompress a .gz file and return the raw buffer
 */
function decompress(gzPath) {
  const compressed = fs.readFileSync(gzPath)
  return zlib.gunzipSync(compressed)
}

/**
 * Compute SHA-256 hash of a buffer
 */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Parse tool name and platform from filename
 * e.g., "pandoc-darwin-arm64.gz" -> { tool: "pandoc", platform: "darwin-arm64" }
 */
function parseFilename(filename) {
  const match = filename.match(/^(pandoc|typst)-(.+)\.gz$/)
  if (!match) return null

  const [, tool, platform] = match
  if (!PLATFORMS[platform]) {
    console.warn(`⚠️  Unknown platform: ${platform} (skipping)`)
    return null
  }

  return { tool, platform }
}

/**
 * Main script
 */
function main() {
  const [, , version, baseUrl] = process.argv

  if (!version || !baseUrl) {
    console.error('Usage: node generate-manifest.js <version> <base-url>')
    process.exit(1)
  }

  console.log(`📝 Generating tools manifest for version ${version}`)
  console.log(`🔗 Base URL: ${baseUrl}`)

  // Read all .gz files
  if (!fs.existsSync(BINARIES_DIR)) {
    console.error(`❌ Binaries directory not found: ${BINARIES_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(BINARIES_DIR).filter((f) => f.endsWith('.gz'))
  console.log(`📦 Found ${files.length} binary archives`)

  // Initialize manifest structure
  const manifest = {
    pandoc: { version: '3.6.4', platforms: {} },
    typst: { version: '0.12.0', platforms: {} },
    styles: {},
  }

  // Process each binary
  for (const filename of files) {
    const parsed = parseFilename(filename)
    if (!parsed) continue

    const { tool, platform } = parsed
    const gzPath = path.join(BINARIES_DIR, filename)

    console.log(`  ▶ Processing ${tool} ${platform}...`)

    // Decompress and compute hash/size
    const raw = decompress(gzPath)
    const hash = sha256(raw)
    const size = raw.length

    // Add to manifest
    manifest[tool].platforms[platform] = {
      url: `${baseUrl}/${filename}`,
      sha256: hash,
      size: size,
    }

    console.log(`    ✓ SHA256: ${hash.substring(0, 16)}...`)
    console.log(`    ✓ Size: ${(size / 1024 / 1024).toFixed(2)} MB`)
  }

  // Write manifest
  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2))
  console.log(`\n✅ Manifest written to ${OUTPUT_PATH}`)

  // Summary
  const pandocCount = Object.keys(manifest.pandoc.platforms).length
  const typstCount = Object.keys(manifest.typst.platforms).length
  console.log(`\n📊 Summary:`)
  console.log(`   Pandoc: ${pandocCount} platforms`)
  console.log(`   Typst: ${typstCount} platforms`)
}

main()
