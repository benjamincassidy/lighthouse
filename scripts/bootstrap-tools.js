#!/usr/bin/env node
/**
 * bootstrap-tools.js — Download and install pandoc + typst binaries for
 * local development, bypassing BinaryManager's GitHub release flow.
 *
 * Usage:
 *   node scripts/bootstrap-tools.js <vault-path>
 *
 * Example:
 *   node scripts/bootstrap-tools.js ~/Documents/DevVault
 *
 * Places binaries at:
 *   <vault>/.obsidian/plugins/lighthouse/bin/pandoc
 *   <vault>/.obsidian/plugins/lighthouse/bin/typst
 * And writes installed.json so BinaryManager.isReady() returns true.
 *
 * Requires: curl or Node.js https (built-in), tar + unzip (standard on macOS/Linux)
 */

'use strict'

const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

// ---------------------------------------------------------------------------
// Config — bump these to test a different binary version locally
// ---------------------------------------------------------------------------

const PANDOC_VERSION = '3.6.4'
const TYPST_VERSION = '0.14.2'
const PLUGIN_ID = 'lighthouse'

// ---------------------------------------------------------------------------
// Platform detection (mirrors ToolsManifest.currentPlatformKey)
// ---------------------------------------------------------------------------

function getPlatformKey() {
  const plat = process.platform
  const arch = process.arch
  if (plat === 'darwin' && arch === 'arm64') return 'darwin-arm64'
  if (plat === 'darwin' && arch === 'x64') return 'darwin-x64'
  if (plat === 'linux' && arch === 'x64') return 'linux-x64'
  if (plat === 'linux' && arch === 'arm64') return 'linux-arm64'
  if (plat === 'win32' && arch === 'x64') return 'win32-x64'
  return null
}

// ---------------------------------------------------------------------------
// Download descriptors — mirrors the GitHub Actions workflow
// ---------------------------------------------------------------------------

function getPandocDescriptor(platformKey) {
  const ver = PANDOC_VERSION
  const base = `https://github.com/jgm/pandoc/releases/download/${ver}`
  const descriptors = {
    'darwin-arm64': {
      url: `${base}/pandoc-${ver}-arm64-macOS.zip`,
      type: 'zip',
      innerPath: `pandoc-${ver}/bin/pandoc`,
      binaryFilename: 'pandoc',
    },
    'darwin-x64': {
      url: `${base}/pandoc-${ver}-x86_64-macOS.zip`,
      type: 'zip',
      innerPath: `pandoc-${ver}/bin/pandoc`,
      binaryFilename: 'pandoc',
    },
    'linux-x64': {
      url: `${base}/pandoc-${ver}-linux-amd64.tar.gz`,
      type: 'tar.gz',
      innerPath: `pandoc-${ver}/bin/pandoc`,
      binaryFilename: 'pandoc',
    },
    'linux-arm64': {
      url: `${base}/pandoc-${ver}-linux-arm64.tar.gz`,
      type: 'tar.gz',
      innerPath: `pandoc-${ver}/bin/pandoc`,
      binaryFilename: 'pandoc',
    },
    'win32-x64': {
      url: `${base}/pandoc-${ver}-windows-x86_64.zip`,
      type: 'zip',
      innerPath: `pandoc-${ver}/pandoc.exe`,
      binaryFilename: 'pandoc.exe',
    },
  }
  return descriptors[platformKey]
}

function getTypstDescriptor(platformKey) {
  const ver = TYPST_VERSION
  const base = `https://github.com/typst/typst/releases/download/v${ver}`
  const descriptors = {
    'darwin-arm64': {
      url: `${base}/typst-aarch64-apple-darwin.tar.xz`,
      type: 'tar.xz',
      innerPath: `typst-aarch64-apple-darwin/typst`,
      binaryFilename: 'typst',
    },
    'darwin-x64': {
      url: `${base}/typst-x86_64-apple-darwin.tar.xz`,
      type: 'tar.xz',
      innerPath: `typst-x86_64-apple-darwin/typst`,
      binaryFilename: 'typst',
    },
    'linux-x64': {
      url: `${base}/typst-x86_64-unknown-linux-musl.tar.xz`,
      type: 'tar.xz',
      innerPath: `typst-x86_64-unknown-linux-musl/typst`,
      binaryFilename: 'typst',
    },
    'linux-arm64': {
      url: `${base}/typst-aarch64-unknown-linux-musl.tar.xz`,
      type: 'tar.xz',
      innerPath: `typst-aarch64-unknown-linux-musl/typst`,
      binaryFilename: 'typst',
    },
    'win32-x64': {
      url: `${base}/typst-x86_64-pc-windows-msvc.zip`,
      type: 'zip',
      innerPath: `typst-x86_64-pc-windows-msvc/typst.exe`,
      binaryFilename: 'typst.exe',
    },
  }
  return descriptors[platformKey]
}

// ---------------------------------------------------------------------------
// Downloader — follows redirects, shows progress
// ---------------------------------------------------------------------------

function download(url, destFile) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destFile)

    function get(currentUrl) {
      https
        .get(currentUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            // GitHub releases redirect to S3
            return get(res.headers.location)
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} downloading ${currentUrl}`))
          }

          const total = parseInt(res.headers['content-length'] || '0', 10)
          let received = 0

          res.on('data', (chunk) => {
            received += chunk.length
            if (total > 0) {
              const pct = Math.round((received / total) * 100)
              const mb = (received / 1024 / 1024).toFixed(1)
              const totalMb = (total / 1024 / 1024).toFixed(1)
              process.stdout.write(`\r    ${pct}%  ${mb} / ${totalMb} MB   `)
            } else {
              process.stdout.write(`\r    ${(received / 1024 / 1024).toFixed(1)} MB downloaded   `)
            }
          })

          res.pipe(file)
          file.on('finish', () => {
            process.stdout.write('\n')
            file.close(resolve)
          })
          file.on('error', reject)
          res.on('error', reject)
        })
        .on('error', reject)
    }

    get(url)
  })
}

// ---------------------------------------------------------------------------
// Archive extraction — uses system tar / unzip
// ---------------------------------------------------------------------------

function extract(archivePath, innerPath, destPath, type) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-bootstrap-'))
  try {
    if (type === 'zip') {
      execSync(`unzip -q -o "${archivePath}" "${innerPath}" -d "${tmpDir}"`)
    } else if (type === 'tar.gz') {
      execSync(`tar -xzf "${archivePath}" -C "${tmpDir}" "${innerPath}"`)
    } else if (type === 'tar.xz') {
      execSync(`tar -xJf "${archivePath}" -C "${tmpDir}" "${innerPath}"`)
    } else {
      throw new Error(`Unknown archive type: ${type}`)
    }

    const extractedPath = path.join(tmpDir, innerPath)
    if (!fs.existsSync(extractedPath)) {
      throw new Error(`Expected extracted file not found: ${extractedPath}`)
    }
    fs.copyFileSync(extractedPath, destPath)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse args
  const vaultArg = process.argv[2]
  if (!vaultArg) {
    console.error('Usage: node scripts/bootstrap-tools.js <vault-path>')
    console.error('')
    console.error('Example:')
    console.error('  node scripts/bootstrap-tools.js ~/Documents/DevVault')
    process.exit(1)
  }

  const vaultPath = path.resolve(vaultArg.replace(/^~/, os.homedir()))
  if (!fs.existsSync(vaultPath)) {
    console.error(`Vault path does not exist: ${vaultPath}`)
    process.exit(1)
  }

  const platformKey = getPlatformKey()
  if (!platformKey) {
    console.error(`Unsupported platform: ${process.platform}-${process.arch}`)
    process.exit(1)
  }

  const binDir = path.join(vaultPath, '.obsidian', 'plugins', PLUGIN_ID, 'bin')
  fs.mkdirSync(binDir, { recursive: true })

  console.log(`Platform : ${platformKey}`)
  console.log(`Bin dir  : ${binDir}`)
  console.log('')

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-dl-'))
  const installed = {}

  try {
    // ---- pandoc ----
    const pandoc = getPandocDescriptor(platformKey)
    console.log(`▶ pandoc ${PANDOC_VERSION}`)
    console.log(`  ${pandoc.url}`)

    const pandocArchive = path.join(tmpDir, 'pandoc-archive')
    await download(pandoc.url, pandocArchive)

    const pandocDest = path.join(binDir, pandoc.binaryFilename)
    process.stdout.write(`  Extracting ${pandoc.innerPath}... `)
    extract(pandocArchive, pandoc.innerPath, pandocDest, pandoc.type)
    console.log('done')

    if (process.platform !== 'win32') fs.chmodSync(pandocDest, 0o755)

    // macOS quarantine — silently ignore errors (file may not be quarantined)
    if (process.platform === 'darwin') {
      try {
        execSync(`xattr -dr com.apple.quarantine "${pandocDest}"`, { stdio: 'ignore' })
      } catch {}
    }

    installed.pandoc = PANDOC_VERSION
    console.log(`  ✓ ${pandocDest}`)
    console.log('')

    // ---- typst ----
    const typst = getTypstDescriptor(platformKey)
    console.log(`▶ typst ${TYPST_VERSION}`)
    console.log(`  ${typst.url}`)

    const typstArchive = path.join(tmpDir, 'typst-archive')
    await download(typst.url, typstArchive)

    const typstDest = path.join(binDir, typst.binaryFilename)
    process.stdout.write(`  Extracting ${typst.innerPath}... `)
    extract(typstArchive, typst.innerPath, typstDest, typst.type)
    console.log('done')

    if (process.platform !== 'win32') fs.chmodSync(typstDest, 0o755)

    if (process.platform === 'darwin') {
      try {
        execSync(`xattr -dr com.apple.quarantine "${typstDest}"`, { stdio: 'ignore' })
      } catch {}
    }

    installed.typst = TYPST_VERSION
    console.log(`  ✓ ${typstDest}`)
    console.log('')
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  // Write installed.json — same format BinaryManager reads
  const installedPath = path.join(binDir, 'installed.json')
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2), 'utf8')

  console.log(`✓ Written ${installedPath}`)
  console.log('')
  console.log('Bootstrap complete. Reload Obsidian (Cmd+R) to pick up the new binaries.')
}

main().catch((err) => {
  console.error('')
  console.error('Bootstrap failed:', err.message)
  process.exit(1)
})
