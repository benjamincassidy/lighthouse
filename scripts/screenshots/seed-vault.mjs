#!/usr/bin/env node
// Builds a throwaway Obsidian vault at .demo-vault/ with a realistic Lighthouse
// project, for generating store-listing screenshots. Re-run any time — it
// wipes and rebuilds the vault from scratch, so it's always reproducible.

import { randomUUID } from 'crypto'
import {
  existsSync,
  cpSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const vaultDir = join(repoRoot, '.demo-vault')
const templateDir = join(__dirname, 'vault-template')

const PROJECT_ROOT = 'Coastal Light'

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Rough approximation of the plugin's own word counter — close enough to
// give the seeded "today" stat a realistic baseline rather than reporting
// the entire project as written in the last 24 hours.
function countWordsInDir(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += countWordsInDir(full)
    } else if (entry.name.endsWith('.md')) {
      const text = readFileSync(full, 'utf8')
      total += text.split(/\s+/).filter(Boolean).length
    }
  }
  return total
}

function daysAgo(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Builds 90 days of daily word counts with:
 *  - a ~10-day active streak running up to today
 *  - an earlier ~16-day streak (so "personal best" shows a real number)
 *  - noisy, plausible history everywhere else
 */
function buildDailyWordCounts() {
  const counts = {}
  const rand = (min, max) => min + Math.floor(Math.random() * (max - min))

  for (let i = 89; i >= 0; i--) {
    const key = isoDate(daysAgo(i))

    if (i <= 9) {
      // Current streak: the last 10 days, including today
      counts[key] = rand(350, 800)
    } else if (i >= 20 && i <= 35) {
      // Earlier personal-best streak: 16 consecutive days
      counts[key] = rand(300, 750)
    } else if (i >= 10 && i <= 19) {
      // Gap between the two streaks — mostly misses
      counts[key] = Math.random() < 0.75 ? 0 : rand(100, 400)
    } else {
      // General history: noisy
      counts[key] = Math.random() < 0.3 ? 0 : rand(150, 700)
    }
  }
  return counts
}

function buildDaysOff() {
  // A couple of deliberate rest days in the noisy older history
  return [isoDate(daysAgo(55)), isoDate(daysAgo(62))]
}

function buildProject() {
  const now = new Date()
  const createdAt = daysAgo(60).toISOString()
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + 70)

  const dailyWordCounts = buildDailyWordCounts()
  const todayKey = isoDate(now)
  const todayCount = dailyWordCounts[todayKey] ?? 0
  // Baseline is "words that existed before today's writing" — total minus
  // today's seeded delta — so the live "Today" stat shows a realistic
  // number instead of the entire project (which it would if baseline = 0).
  const totalWords = countWordsInDir(join(vaultDir, PROJECT_ROOT, 'Chapters'))
  const todayWordCountBaseline = Math.max(0, totalWords - todayCount)

  return {
    id: randomUUID(),
    name: 'Coastal Light',
    rootPath: PROJECT_ROOT,
    extrasFolder: 'Extras',
    createdAt,
    updatedAt: now.toISOString(),
    wordCountGoal: 10000,
    goalDirection: 'at-least',
    deadline: isoDate(deadline),
    dailyGoal: 400,
    dailyWordCounts,
    daysOff: buildDaysOff(),
    todayWordCountBaseline,
    todayWordCountDate: todayKey,
    folderIcons: {
      [`${PROJECT_ROOT}/Chapters`]: 'book',
      [`${PROJECT_ROOT}/Extras/Characters`]: 'people',
      [`${PROJECT_ROOT}/Extras/Research`]: 'compass',
    },
    folderGoals: {
      [`${PROJECT_ROOT}/Chapters/Act One`]: 1800,
      [`${PROJECT_ROOT}/Chapters/Act Two`]: 3000,
    },
    fileGoals: {
      [`${PROJECT_ROOT}/Chapters/Act One/01 - Departure.md`]: 700,
    },
    fileOrder: [
      `${PROJECT_ROOT}/Chapters/Act One`,
      `${PROJECT_ROOT}/Chapters/Act One/01 - Departure.md`,
      `${PROJECT_ROOT}/Chapters/Act One/02 - The Lightless Coast.md`,
      `${PROJECT_ROOT}/Chapters/Act One/03 - Keeper's Log.md`,
      `${PROJECT_ROOT}/Chapters/Act Two`,
      `${PROJECT_ROOT}/Chapters/Act Two/04 - Storm Warning.md`,
      `${PROJECT_ROOT}/Chapters/Act Two/05 - What the Tide Brings.md`,
      `${PROJECT_ROOT}/Chapters/Act Two/06 - The Wreck.md`,
      `${PROJECT_ROOT}/Chapters/Act Two/07 - Low Tide.md`,
      `${PROJECT_ROOT}/Chapters/Act Three`,
      `${PROJECT_ROOT}/Chapters/Act Three/08 - The Last Light.md`,
    ],
  }
}

function main() {
  console.log('Rebuilding demo vault at', vaultDir)
  rmSync(vaultDir, { recursive: true, force: true })
  mkdirSync(vaultDir, { recursive: true })

  // Copy hand-authored prose into the project root
  cpSync(templateDir, join(vaultDir, PROJECT_ROOT), { recursive: true })

  const obsidianDir = join(vaultDir, '.obsidian')
  mkdirSync(obsidianDir, { recursive: true })

  writeFileSync(
    join(obsidianDir, 'community-plugins.json'),
    JSON.stringify(['lighthouse'], null, 2),
  )
  writeFileSync(join(obsidianDir, 'app.json'), JSON.stringify({}, null, 2))
  writeFileSync(
    join(obsidianDir, 'appearance.json'),
    JSON.stringify(
      { theme: 'obsidian', accentColor: '#3d8bc4', cssTheme: '', translucency: false },
      null,
      2,
    ),
  )
  writeFileSync(
    join(obsidianDir, 'core-plugins.json'),
    JSON.stringify(
      {
        'file-explorer': true,
        'global-search': true,
        switcher: true,
        graph: false,
        backlink: false,
        'outgoing-link': false,
        'tag-pane': false,
        properties: true,
        'page-preview': true,
        'note-composer': true,
        'command-palette': true,
        'editor-status': true,
        bookmarks: false,
        outline: true,
        'word-count': true,
        'file-recovery': false,
      },
      null,
      2,
    ),
  )

  const project = buildProject()
  writeFileSync(
    join(obsidianDir, 'lighthouse.json'),
    JSON.stringify(
      {
        projects: [project],
        activeProjectId: project.id,
        flowModeHideStatusBar: true,
        flowModeHideRibbon: true,
        flowTypewriterScroll: true,
        flowFont: '',
        flowLineHeight: 0,
        flowLineWidth: 0,
        showWordCountInStatusBar: true,
        excludeCodeBlocks: true,
        excludeFrontmatter: true,
        debugMode: false,
        workspaceActive: false,
      },
      null,
      2,
    ),
  )

  // Install the freshly built plugin
  const pluginDir = join(obsidianDir, 'plugins', 'lighthouse')
  mkdirSync(pluginDir, { recursive: true })
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    const src = join(repoRoot, file)
    if (!existsSync(src)) {
      console.error(`Missing ${file} — run "npm run build" first.`)
      process.exit(1)
    }
    cpSync(src, join(pluginDir, file))
  }

  console.log('Demo vault ready:', vaultDir)
  console.log('Project word goal:', project.wordCountGoal, '· deadline:', project.deadline)
}

main()
