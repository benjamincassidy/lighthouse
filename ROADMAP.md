# Lighthouse — Master Roadmap

This is the canonical implementation checklist. Work proceeds top-to-bottom within each sprint. See [VISION.md](VISION.md) for goals and [FEATURES.md](FEATURES.md) for detailed implementation specs.

---

## Git State

- [x] Merge `feature/drag-drop-sorting` → `main`
- [x] Create branch `sprint/workspace-identity` for Sprint 0

---

## Sprint 0 — Workspace & Identity

> **Goal:** Lighthouse feels like a real application, not a collection of panels.
> Everything built from Sprint 1 onward inherits this identity layer.

### 0.1 Design System (styles.css)

Introduce Lighthouse design tokens. Every component going forward is built on these.

- [ ] Add `--lh-accent` (`#E8A430` — Lighthouse amber; warm, reads in light + dark)
- [ ] Add `--lh-accent-hover` (`#D4941A`)
- [ ] Add `--lh-accent-subtle` (amber at ~12% opacity, for card highlights and hover states)
- [ ] Add `--lh-ring-track` (maps to `var(--background-modifier-border)`)
- [ ] Add `--lh-ring-fill` (maps to `var(--lh-accent)`)
- [ ] Add `--lh-transition-ring` (`stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)`)
- [ ] Document section-label convention: `.lh-section-label` — ALL CAPS, `0.72em`, `letter-spacing: 0.08em`, `var(--text-faint)`, `font-weight: 600`
- [ ] Document stat-value convention: `.lh-stat-value` — large, weight-600, tabular numerals (`font-variant-numeric: tabular-nums`)
- [ ] Migrate Dashboard.svelte and StatsPanel.svelte inline styles to use new tokens

### 0.2 WorkspaceManager

New service: `src/core/WorkspaceManager.ts`

- [ ] `enterWritingWorkspace()`:
  - Save current layout via `app.workspace.getLayout()` to plugin data key `savedLayout`
  - Open Project Explorer in left sidebar (reuse `activateProjectExplorer` logic)
  - Open Stats Panel in right sidebar (reuse `activateStatsPanel` logic)
  - Collapse left sidebar to only show Explorer tab; right sidebar to only Stats tab
  - Set `document.body.setAttribute('data-lighthouse-workspace', 'true')`
  - Persist `isActive = true` to plugin data
- [ ] `exitWritingWorkspace()`:
  - Restore saved layout via `app.workspace.changeLayout(savedLayout)`
  - Remove `data-lighthouse-workspace` attribute
  - Persist `isActive = false`
- [ ] `isWritingWorkspaceActive(): boolean`
- [ ] `toggleWritingWorkspace()` — convenience toggle
- [ ] On plugin load: restore `isActive` state, re-enter workspace if it was active before reload
- [ ] Register on `LighthousePlugin` as `plugin.workspaceManager`

### 0.3 Workspace Entry Points

- [ ] Replace all three ribbon icons with a single **Lighthouse beacon** ribbon icon (`lucide-beacon` or similar)
  - Clicking toggles Writing Workspace on/off
  - Icon changes to indicate active state (filled vs outline, or uses Obsidian's `setAttr('aria-label', ...)`)
- [ ] Register `open-writing-workspace` command: "Open Writing Workspace"
- [ ] Register `exit-writing-workspace` command: "Exit Writing Workspace"
- [ ] Keep individual `open-dashboard`, `open-project-explorer`, `open-stats-panel` commands (power users)

### 0.4 Explorer Workspace Header

Add a `WorkspaceHeader` section to the top of `ProjectExplorer.svelte`:

- [ ] Lighthouse wordmark / branding strip — small, refined. `LIGHTHOUSE` in tracked uppercase with the beacon icon, or just the icon with styled "Lighthouse" text
- [ ] Active project name — bold, prominent, truncated with ellipsis
- [ ] Workspace mode tabs (icon-only or icon+label, compact):
  - **Write** — tree view (current default)
  - **Outline** — heading tree (Phase 3)
  - **Corkboard** — scene cards (Phase 3)
  - Show Write mode as active by default; other tabs show as disabled/dimmed until implemented
- [ ] Exit workspace button (`⊗` or `×`) at far right — calls `workspaceManager.exitWritingWorkspace()`
- [ ] A subtle bottom border separating the header from the tree

### 0.5 Dashboard Redesign

Rethink the Dashboard as a **Project Home Screen**, not a utility panel:

- [ ] Dashboard opens as a full tab in the main area (`workspace.getLeaf('tab')`) — same as before, but now it's the natural landing view for a project
- [ ] Layout: full-width, two-column at wider widths, single-column at narrow
- [ ] **Hero section**: large project name, word count / goal at a glance, the progress ring (larger — 120px), "days active" or "started X ago"
- [ ] **Stats row**: 4-stat grid using `.lh-stat-value` and `.lh-section-label` — Total Words, Files, Content Folders, Source Folders
- [ ] **Goal section**: if goal is set → ring + `n words to go` + creation date. If no goal → big word count with a "Set goal" link.
- [ ] **Project switcher**: moved to a compact dropdown in the section header, not the primary focus
- [ ] Create / Edit / Delete actions moved to a kebab menu (`⋯`) or moved inside the project switcher header
- [ ] Apply `--lh-accent` amber to the ring and all accent numbers
- [ ] Add room (hidden/empty placeholders) for upcoming sections: Recent Activity, Writing Streak, Sprint History

### 0.6 Stats Panel Visual Refresh

Apply design system tokens throughout `StatsPanel.svelte`:

- [ ] Section headers: `CURRENT FILE`, `TODAY`, `PROJECT` using `.lh-section-label` style — no more raw `h3` with custom styles
- [ ] Project goal ring: switch to `--lh-accent` amber stroke
- [ ] Layout: reduce visual noise, tighten spacing
- [ ] Ensure every value uses tabular numerals (`font-variant-numeric: tabular-nums`)
- [ ] Stat delta colors (implements FEATURES.md Feature K alongside this):
  - Session delta `> 0`: `var(--color-green)`
  - Session delta `< 0`: `var(--color-orange)` (heavy edit session — not "bad", so orange not red)
  - Session delta `= 0`: `var(--text-faint)`
  - Same for today's count relative to daily target

### 0.7 Extract WritingSessionTracker

Structural prerequisite for Sprint Mode, Heatmap, and Analytics.

New service: `src/core/WritingSessionTracker.ts`

- [ ] Constructor: takes `plugin: LighthousePlugin`
- [ ] `initSession(project: Project, currentWordCount: number)` — sets session baseline, loads today's date/baseline from project data
- [ ] `getSessionDelta(currentWordCount: number): number` — words written since session start
- [ ] `getTodayDelta(currentWordCount: number): number` — words written today
- [ ] `onNewDay(currentWordCount: number)` — handles date rollover, resets baselines, snaps history
- [ ] `snapshotToday(project: Project, currentWordCount: number): Promise<void>` — writes `todayWordCountBaseline` and `todayWordCountDate` to project (replaces the `updateProject` calls in StatsPanel)
- [ ] Unit tests: session tracking, day rollover, delta calculations
- [ ] Refactor `StatsPanel.svelte` to consume `WritingSessionTracker` instead of managing state directly
- [ ] Remove session-tracking logic from `StatsPanel.svelte`, keep only display logic

---

## Sprint 1 — Core Writing Features

> **Goal:** The writing flow is focused and motivating.

### 1.1 File Status Indicators (FEATURES.md D) ✅

- [x] `src/utils/fileStatus.ts`: `STATUS_COLORS` map (`draft` → red, `revising` → yellow, `done` → green, fallback → faint)
- [x] `TreeNode.svelte`: accept optional `status?: string` prop; render a 6px colored circle dot before the filename when set. CSS in component.
- [x] `ProjectExplorer.svelte` `buildTreeNode`: read `app.metadataCache.getFileCache(file)?.frontmatter?.status` and pass as `status` prop to TreeNode
- [x] Register `metadataChanged` / `resolve` event to refresh tree when frontmatter changes
- [x] Unit test for `fileStatus.ts` color map
- [x] CSS: `.lh-status-dot` in `styles.css`

### 1.2 Advanced Flow Mode (FEATURES.md I) ✅

- [x] **Typewriter scroll** (`flowTypewriterScroll: boolean`): on `enterFlowMode`, register `workspace.on('editor-change')` listener that calls `editor.scrollIntoView(cursor, true)` to keep cursor vertically centered. Unregistered via `workspace.offref()` on exit.
- [x] **Paragraph focus** (`flowFocusMode: 'paragraph'`): adds `.lh-focus-paragraph` class to all `.cm-editor` elements; CSS rule `opacity: 0.25` on all `.cm-line:not(.cm-activeLine)` elements.
- [x] **Sentence focus** (`flowFocusMode: 'sentence'`): same mechanism with `.lh-focus-sentence` class — uses the same CM active-line CSS hook.
- [x] **Typography overrides**: on `enterFlowMode`, sets CSS custom properties (`--lh-flow-font`, `--lh-flow-line-height`, `--lh-flow-line-width`) on `document.body` and adds `body.lh-flow-active`; scoped CSS in `styles.css` applies them to `.cm-editor`. Removed on exit.
- [x] Settings subsection: "Focus & typography" — typewriter toggle, focus mode dropdown, font input, line height input, max width input
- [x] Add `flowTypewriterScroll`, `flowFocusMode`, `flowFont`, `flowLineHeight`, `flowLineWidth` to `LighthouseSettings`
- [x] Unit tests: `buildTypographyVars` pure function (7 tests), CSS property injection/cleanup (5 tests), typewriter scroll event registration (4 tests), focus mode class application (5 tests)

### 1.3 Sprint Mode

New feature module: `src/features/sprintMode/`

- [ ] `SprintController.ts`:
  - `startSprint(durationMinutes: number, startWordCount: number)` — stores `startTime`, `startWordCount`, `durationMs`
  - `getProgress(): { elapsed: number, remaining: number, percentDone: number }`
  - `endSprint(finalWordCount: number): SprintResult` — returns `{ wordsWritten, duration, wpm, startedAt }`
  - `cancelSprint()`
  - `isActive: boolean`
  - Stores completed sprints in `project.sprintHistory` (cap at 50)
- [ ] `SprintUI.svelte` — embedded in the Stats Panel's bottom section:
  - Duration selector (10 / 15 / 20 / 30 min + custom)
  - Start button → shows countdown with a progress ring (amber, `--lh-accent`)
  - Live words-written counter during sprint
  - Stop / cancel controls
- [ ] End-of-sprint Notice: `new Notice(`Sprint complete! You wrote ${result.wordsWritten} words in ${result.duration} min.`, 6000)`
- [ ] Sprint history: compact list in Dashboard (most recent 5 sprints) in placeholder section from 0.5
- [ ] Add `sprintHistory?: SprintEntry[]` to `Project` type
- [ ] Add `SprintEntry` interface to `types.ts`
- [ ] `init(plugin: LighthousePlugin)` entry point
- [ ] Unit tests: SprintController state machine, duration/wpm calculations

### 1.4 Folder / Chapter Word Goals (VISION Phase 2 item 8)

- [ ] Add `folderGoals?: Record<string, number>` to `Project` type
- [ ] `ProjectModal.ts`: "Chapter Goals" section — list of content folders with optional word count inputs
- [ ] `ProjectExplorer.svelte`: read `folderGoals` and pass goal to folder TreeNodes
- [ ] `TreeNode.svelte`: folder nodes accept optional `goal?: number` and `wordCount?: number` props. When set, render a small ambient progress ring (24px, amber) next to the folder name. Title: "X / Y words".
- [ ] `HierarchicalCounter`: expose per-folder word counts to the explorer efficiently (cache layer here handles the perf concern)
- [ ] Unit tests: goal progress calculation, ring percent clamping

---

## Sprint 2 — Manuscript & Productivity

> **Goal:** Writers can see, organize, and export their work as a whole.

### 2.1 Manuscript Mode (Continuous Read-Only View) (VISION Phase 2 item 7)

New view: `src/ui/views/ManuscriptView.ts` + `ManuscriptView.svelte`

- [ ] Registers as `lighthouse-manuscript-view`
- [ ] Reads content files in `fileOrder` order
- [ ] Renders each file via `MarkdownRenderer.renderMarkdown()` into a section `div`
- [ ] Subtle file separator: filename in `SMALL CAPS`, `--lh-section-label` style, with a horizontal rule
- [ ] Clicking anywhere in a section opens that file in the active editor leaf
- [ ] "Edit" button on hover over each section header
- [ ] Scroll position preserved across re-renders
- [ ] Register view + command `open-manuscript-mode`
- [ ] Add to Workspace mode tabs in Explorer header (as "Read" mode tab)
- [ ] Tests: file ordering, section construction logic

### 2.2 Inspector / Metadata Sidecar (FEATURES.md H)

New view: `src/ui/views/InspectorView.ts` + `InspectorView.svelte`

- [ ] Registers as `lighthouse-inspector-view` in right sidebar
- [ ] **Synopsis field**: reads `synopsis:` frontmatter via `metadataCache`; debounced write via `app.fileManager.processFrontMatter`. Shows placeholder "Add a synopsis…" when empty.
- [ ] **Labels**: `status:` frontmatter displayed as a styled badge with STATUS_COLORS (reuses fileStatus.ts). Clickable to change.
- [ ] **Scratchpad**: per-file notes in plugin data key `fileScratchpads`, never written to vault. Debounced save.
- [ ] **Linked references**: scans active file's resolved links, filters to project Source folder files, renders as clickable chips
- [ ] Updates when `active-leaf-change` fires
- [ ] Register view + `open-inspector` command
- [ ] Add to Workspace right-sidebar alongside Stats Panel (tab switching between them in future)
- [ ] Tests: frontmatter read/write, scratchpad persistence

### 2.3 Target-Specific Goals (FEATURES.md E)

- [ ] Add `wordCountGoalType?: 'at-least' | 'at-most'` to `Project`
- [ ] Add `fileGoals?: Record<string, number>` to `Project`
- [ ] `ProjectModal.ts`: goal type toggle (At least / At most)
- [ ] Dashboard progress ring: red when over goal in `at-most` mode
- [ ] Explorer context menu for files: "Set word goal…" → small prompt → saves to `project.fileGoals[path]`
- [ ] TreeNode: file nodes with a goal show a small arc icon next to name (24px partial ring)
- [ ] Stats Panel: "File Goal" progress row when active file has a goal set
- [ ] Tests: goal type logic, progress calculation

### 2.4 Project Compilation & Export (FEATURES.md B)

New service: `src/core/ProjectCompiler.ts`

- [ ] `compile(project, order, options): Promise<string>` — concatenates content files, strips frontmatter, converts `[[wikilinks]]` to text, inserts separator (default `---`)
- [ ] Options: `stripFrontmatter`, `stripWikiLinks`, `separator`
- [ ] New modal: `src/ui/modals/CompileModal.ts` — filename, separator, options toggles, ~500-char preview
- [ ] "Compile" button in Dashboard header actions
- [ ] Command: `compile-project`
- [ ] Output safety: warn if target path is inside a content folder
- [ ] Tests: frontmatter stripping, wikilink conversion, separator insertion, order correctness

### 2.5 File Splitting & Merging (FEATURES.md C)

New service: `src/core/FileSplitter.ts`

- [ ] `splitAtCursor(file, cursorOffset): Promise<[TFile, TFile]>` — writes first half back, creates `{name} 2.md` (auto-increments), registers new file in `fileOrder` after source
- [ ] `mergeFiles(target, source): Promise<void>` — appends source content (frontmatter stripped) to target with `---`, deletes source, removes from `fileOrder`
- [ ] Command: `split-note-at-cursor` — reads active editor cursor position
- [ ] Explorer context menu: "Merge into…" → fuzzy-suggest picker for merge target → confirmation prompt
- [ ] Tests: split content correctness, merge content, fileOrder update after both operations

---

## Sprint 3 — Structure & Organization

> **Goal:** Writers have structural tools for complex manuscripts.

### 3.1 Outline View

New view: `src/ui/views/OutlineView.ts` + `OutlineView.svelte`

- [ ] Registers as `lighthouse-outline-view`
- [ ] Reads `metadataCache.getFileCache(file)?.headings` for all project content files (zero I/O)
- [ ] Renders file → heading → subheading hierarchy with indentation
- [ ] Clicking a heading: opens the file and scrolls to that heading
- [ ] Drag-to-reorder files: reuses `reorderPaths` utility
- [ ] Invalidates on `metadataCache` `changed` event for active project files
- [ ] Add to Explorer mode tabs ("Outline" tab)
- [ ] Tests: heading hierarchy construction, file ordering integration

### 3.2 Scene Card View (FEATURES.md / VISION Phase 3)

New view: `src/ui/views/SceneCardView.ts` + `SceneCardView.svelte`

- [ ] Registers as `lighthouse-scene-card-view`
- [ ] Reads `synopsis:` frontmatter (falls back to first non-frontmatter line, max 120 chars)
- [ ] Grid of cards — each card: filename (without `.md`), optional chapter/folder label at top, synopsis body
- [ ] Cards arranged in `fileOrder` order
- [ ] Drag-to-reorder cards → updates `fileOrder`
- [ ] Status dot on card using `STATUS_COLORS`
- [ ] Card click → opens file in editor
- [ ] Canvas integration (stretch): "Export to Canvas" button on folder rows — generates `.canvas` file with one card per note in the project
- [ ] Add to Explorer mode tabs ("Cards" tab)
- [ ] Tests: card data construction, synopsis fallback, reorder propagation

### 3.3 Project Snapshots (VISION Phase 3 item 15)

- [ ] Snapshot storage: `.obsidian/lighthouse-snapshots/{projectId}/{filePath}/{timestamp}.md` — outside vault content, never indexed
- [ ] Camera icon button in Explorer file rows (visible on hover)
- [ ] `SnapshotManager.ts`: `takeSnapshot(file)`, `listSnapshots(filePath)`, `restoreSnapshot(snapshotId)`, `diffSnapshot(snapshotId)` (optional diff view)
- [ ] "History" panel in Inspector: list of snapshots for active file with timestamps
- [ ] Restore: confirmation prompt, then writes file content back
- [ ] Tests: snapshot creation, listing, restore

### 3.4 Project-Scoped Find & Replace (VISION Phase 3 item 16)

New modal: `src/ui/modals/FindReplaceModal.ts`

- [ ] Search scoped exclusively to active project Content folder files (never full vault)
- [ ] UI: find field, replace field, case-sensitive toggle, whole-word toggle
- [ ] Preview: list of matches with filename + surrounding context (50 chars each side)
- [ ] "Replace All" with confirmation, shows count
- [ ] Summary notice on completion: "Replaced 47 instances across 12 files."
- [ ] Integration with Snapshots: if Snapshots is available, offer auto-snapshot before replacing
- [ ] Command: `project-find-replace`
- [ ] Tests: search scope, case-sensitivity, whole-word matching, replacement correctness

---

## Sprint 4 — Momentum & Analytics

> **Goal:** Progress is visible, motivating, and honest.

### 4.1 Word Count Cache (Prerequisite)

Refactor `HierarchicalCounter.ts`:

- [ ] Add `private cache: Map<string, { words: number; mtime: number }>`
- [ ] In `countFile()`: check cache first (compare `file.stat.mtime`). Return cached value if mtime matches.
- [ ] `invalidate(path: string)`: remove entry from cache. Called by VaultEventService on `modify`.
- [ ] `invalidateAll()`: clear cache. Called on project switch.
- [ ] Tests: cache hit, cache miss on mtime change, invalidation

### 4.2 Writing Heatmap

New component: `src/ui/components/WritingHeatmap.svelte`

- [ ] 52×7 SVG grid — one cell per day, GitHub-style
- [ ] Color intensity: linear scale from `--lh-accent-subtle` (low) to `--lh-accent` (full)
- [ ] Hover tooltip: date + word count
- [ ] Streak detection: consecutive days at or above daily average; displayed as flame counter next to heatmap
- [ ] Data source: `WritingSessionTracker` daily snapshots (`writingHistory: Record<string, number>` on `Project`)
- [ ] Add `writingHistory: Record<string, number>` to `Project` type
- [ ] Dashboard: heatmap section below stats row
- [ ] Tests: streak calculation, grid cell color mapping

### 4.3 Deadline & Velocity Tracking (VISION Phase 4 item 18)

- [ ] Add `deadline?: string` to `Project` type (ISO date)
- [ ] `src/utils/velocity.ts`: `wordsRemaining`, `daysRemaining`, `requiredDailyVelocity`, `averageDailyVelocity(history, days = 7)`
- [ ] `ProjectModal.ts`: deadline date picker field
- [ ] Dashboard: "Deadline" section, visible when `deadline` is set — days remaining, required daily words, 7-day average, "on track" / "behind" indicator
- [ ] Stats Panel: estimated read time (`⌈words / 250⌉ min`) and speak time (`⌈words / 130⌉ min`)
- [ ] Tests: all velocity.ts functions at edge cases (deadline passed, no history, etc.)

### 4.4 Rolling Daily Goals / Adaptive Velocity (VISION Phase 4 item 19)

- [ ] When daily words > target: carry surplus forward, reduce tomorrow's requirement
- [ ] When daily words < target: redistribute deficit across remaining days
- [ ] "Tomorrow's target" shown on Dashboard adjusted for surplus/deficit
- [ ] Planned day off: `plannedOff?: string[]` on `Project` (array of ISO dates) — does not break streak, words not redistributed
- [ ] Tests: surplus carry-forward, deficit redistribution, planned-off exclusion

### 4.5 Writing Analytics Dashboard (VISION Phase 4 item 20)

New view, replaces or supplements the current Dashboard tab:

- [ ] Velocity section: words/hour (current session), words/day (7-day avg), trend arrow (up/down)
- [ ] Chapter breakdown: horizontal bar chart showing words per content folder
- [ ] Cumulative progress: area sparkline chart using `writingHistory`
- [ ] Estimated completion date at current 7-day velocity
- [ ] Sprint history: bar chart of words per sprint (last 10)
- [ ] Session log: last 5 sessions as cards (date, duration, words, WPM)
- [ ] All calculations consume `WritingSessionTracker` — no raw project data in this view
- [ ] Tests: velocity calculations, completion date estimation

---

## Sprint 5 — Knowledge Integration

> **Goal:** Leverage the unique advantage Scrivener and Ulysses can never match.

### 5.1 Auto-Surfacing Story Bible (VISION Phase 5 item 22)

- [ ] New panel tab in right sidebar: "References"
- [ ] On `editor-change` (debounced 300ms): extract `[[links]]` from paragraph under cursor
- [ ] Filter to links resolving to the active project's Source folder files
- [ ] Render each linked file's content inline in the sidebar using `MarkdownRenderer`
- [ ] Updates as cursor moves between paragraphs
- [ ] Pin button: keeps a reference card visible even when cursor moves away
- [ ] Tests: link extraction, source folder filtering

### 5.2 Narrative Graph (VISION Phase 5 item 21)

- [ ] New view: `src/ui/views/NarrativeGraphView.ts` + `NarrativeGraphView.svelte`
- [ ] Reads `metadataCache.resolvedLinks` filtered to nodes within active project (content + source folders)
- [ ] Renders via minimal D3 v7 force layout
- [ ] Node types: scene (circle), character/location (square — from source folders), research (diamond)
- [ ] Clicking a node opens the file
- [ ] Hovering shows file name tooltip
- [ ] Register view + command `open-narrative-graph`
- [ ] Tests: graph construction, node type classification, link filtering

### 5.3 Vocabulary & Style Insights (VISION Phase 5 item 23)

New utility: `src/utils/styleAnalysis.ts` (pure functions, no Obsidian API dependency)

- [ ] `wordFrequency(text): Map<string, number>` — top N repeated words/phrases
- [ ] `sentenceLengthHistogram(text): number[]` — sentence lengths in words
- [ ] `readabilityScore(text): { fleschKincaid: number; grade: string }` — Flesch–Kincaid
- [ ] `dialoguePercentage(text): number` — ratio of quoted text to total
- [ ] `adverbDensity(text): number` — words ending in -ly as % of total
- [ ] UI: new section in Inspector or separate modal — run on demand, not continuous
- [ ] Tests: all functions with known-output sample text

---

## Long-Term (No Active Sprint)

- [ ] **True Editable Manuscript Mode** — custom CodeMirror 6 extension, multi-file virtual document, bidirectional edit sync. Major standalone project.
- [ ] **User-Defined Workspace Presets** — save/restore named layouts via `workspace.getLayout()` / `workspace.changeLayout()`. Pairs with WorkspaceManager.
- [ ] **Canvas ↔ fileOrder sync** — Corkboard to Canvas export, plus reverse: detecting card moves on Canvas and updating `fileOrder`.
- [ ] **VaultEventService** — centralized event bus, deduplicating the independent vault listeners currently spread across `ProjectExplorer.svelte` and `StatsPanel.svelte`.

---

## Architecture Conventions (enforce from Sprint 0 onward)

| Convention | Rule |
|---|---|
| Design tokens | All new CSS uses `--lh-*` tokens, not hardcoded values |
| Section labels | Use `.lh-section-label` class pattern (CAPS, tracked, faint) |
| Progress | Rings for project/folder goals, bars only for linear progress (heatmap cells) |
| Feature modules | Phase 1+ features live in `src/features/{name}/` with `init(plugin)` export |
| Store updates | Always spread to new object: `{ ...project, field: value }` — never mutate in place |
| Tests | Every new `src/core/` or `src/utils/` file ships with a `.test.ts` alongside it |
| Accessibility | All SVG rings have `aria-hidden="true"`; interactive elements have `aria-label` |
