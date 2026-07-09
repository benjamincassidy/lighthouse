#!/usr/bin/env node
// Launches the real Obsidian.app against .demo-vault/ (built by seed-vault.mjs),
// drives the Lighthouse UI, and captures a curated set of listing screenshots
// into screenshots/, each resized to the community.obsidian.md spec
// (1200x800, 3:2). Re-run any time the UI changes.
//
// Note: we spawn Obsidian ourselves and attach over CDP on a fixed port,
// rather than using Playwright's `_electron.launch()` — Obsidian doesn't
// print the "DevTools listening on ws://..." line _electron waits for to
// auto-discover a `--remote-debugging-port=0` port, so that helper hangs
// forever. A fixed port + chromium.connectOverCDP() works fine.

import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { chromium } from 'playwright'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const vaultPath = join(repoRoot, '.demo-vault')
const outDir = join(repoRoot, 'screenshots')

const OBSIDIAN_BIN = '/Applications/Obsidian.app/Contents/MacOS/Obsidian'
// Isolated profile dir so this doesn't collide with (or touch) a real,
// already-running Obsidian instance — Electron's single-instance lock is
// keyed by user-data-dir, so this gets its own fully independent process.
const userDataDir = join(repoRoot, '.demo-vault-userdata')
const CDP_PORT = 9333
const OUT_WIDTH = 1200
const OUT_HEIGHT = 800

async function main() {
  if (!existsSync(vaultPath)) {
    console.error('No .demo-vault/ found — run "node scripts/screenshots/seed-vault.mjs" first.')
    process.exit(1)
  }
  mkdirSync(outDir, { recursive: true })
  mkdirSync(userDataDir, { recursive: true })

  // Obsidian doesn't auto-open a vault from a bare CLI path argument — it
  // shows the vault picker (app://obsidian.md/starter.html) instead. Since
  // this is a fresh, isolated user-data-dir, pre-register the vault as the
  // one to open automatically, same as Obsidian's own obsidian.json does.
  writeFileSync(
    join(userDataDir, 'obsidian.json'),
    JSON.stringify({
      vaults: {
        'lighthouse-screenshots': { path: vaultPath, ts: Date.now(), open: true },
      },
    }),
  )

  const obsidianProcess = spawn(
    OBSIDIAN_BIN,
    [vaultPath, `--user-data-dir=${userDataDir}`, `--remote-debugging-port=${CDP_PORT}`],
    { stdio: 'ignore', detached: false },
  )

  try {
    const window = await connectToObsidianWindow()
    await window.bringToFront()
    await window.setViewportSize({ width: 1800, height: 1200 })

    await dismissTrustDialogIfPresent(window)
    await window.waitForTimeout(500)

    // Enter the Writing Workspace — idempotent, since Obsidian persists
    // workspace state across launches and it may already be active from a
    // previous run against this same profile.
    await ensureWritingWorkspaceActive(window)
    await ensureRightSidebarOpen(window)
    await widenLibrarySidebar(window)

    // Select the Chapters group (shows Act One/Two/Three, one level flattened)
    await clickGroup(window, 'Chapters')
    await window.waitForTimeout(500)

    // Open the first chapter in the editor
    await window.locator('.lh-sheet-card').first().click()
    await window.waitForTimeout(800)

    await capture(window, '01-writing-workspace')

    // Inspector: Stats tab
    await window.click('[aria-label="Stats"]')
    await window.waitForTimeout(500)
    await capture(window, '02-inspector-stats')

    // Back to Overview, then show Extras / nested groups
    await window.click('[aria-label="Overview"]')
    await window.waitForTimeout(300)
    await clickGroup(window, 'Characters')
    await window.waitForTimeout(500)
    await capture(window, '03-groups-and-extras')

    // Export dialog
    await runCommand(window, 'Lighthouse: Export project')
    await window.waitForTimeout(1000)
    await capture(window, '04-export')
    await window.keyboard.press('Escape')
    await window.waitForTimeout(500)

    // Re-select a chapter so Flow Mode has real prose visible
    await clickGroup(window, 'Chapters')
    await window.waitForTimeout(300)
    await window.locator('.lh-sheet-card').first().click()
    await window.waitForTimeout(500)

    // Flow Mode
    await runCommand(window, 'Lighthouse: Toggle flow mode')
    await window.waitForTimeout(1000)
    await capture(window, '05-flow-mode')

    console.log('Done. Screenshots written to', outDir)
  } finally {
    obsidianProcess.kill()
  }
}

async function connectToObsidianWindow(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
      const contexts = browser.contexts()
      for (const ctx of contexts) {
        for (const page of ctx.pages()) {
          if (page.url().startsWith('app://')) {
            return page
          }
        }
      }
    } catch {
      // CDP not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Could not find the Obsidian app window over CDP.')
}

async function dismissTrustDialogIfPresent(window, timeoutMs = 10000) {
  const trustButton = window.getByText('Trust author and enable plugins', { exact: false })
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await trustButton.count()) {
      await trustButton.first().click()
      await window.waitForTimeout(1000)
      return
    }
    await window.waitForTimeout(300)
  }
}

async function clickGroup(window, name) {
  const target = window.locator('.lh-group-name', { hasText: name }).first()
  await target.scrollIntoViewIfNeeded()
  await target.click()
}

async function ensureWritingWorkspaceActive(window) {
  const alreadyActive = await window
    .locator('.lighthouse-explorer')
    .count()
    .then((n) => n > 0)
  if (alreadyActive) return

  await window.click('[aria-label="Toggle writing workspace"]')
  await window.waitForTimeout(1500)
}

async function ensureRightSidebarOpen(window) {
  const collapsed = await window.evaluate(() => {
    const split = document.querySelector('.workspace-split.mod-right-split')
    return split ? split.classList.contains('is-sidedock-collapsed') : false
  })
  if (collapsed) {
    await window.click('.sidebar-toggle-button.mod-right')
    await window.waitForTimeout(500)
  }
}

// The Library defaults to a 300px sidebar, just under the 340px breakpoint
// where it collapses to a single Ulysses-style drilling column. Widen it so
// screenshots show the full two-column Groups + Sheet List browser.
async function widenLibrarySidebar(window) {
  await window.evaluate(() => {
    const split = document.querySelector('.workspace-split.mod-left-split')
    if (split) split.style.width = '420px'
  })
  await window.waitForTimeout(300)
}

async function runCommand(window, commandText) {
  await window.keyboard.press('Meta+P')
  await window.waitForTimeout(400)
  await window.keyboard.type(commandText, { delay: 20 })
  await window.waitForTimeout(400)
  await window.keyboard.press('Enter')
}

async function capture(window, name) {
  const buf = await window.screenshot()
  const outPath = join(outDir, `${name}.png`)
  await sharp(buf).resize(OUT_WIDTH, OUT_HEIGHT, { fit: 'cover', position: 'top' }).toFile(outPath)
  console.log('  captured', name)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
