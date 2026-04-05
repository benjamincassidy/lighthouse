# Lighthouse — Upcoming Features

This document tracks planned features at an implementation level, with detailed checklists. For the full product vision, strategic roadmap, and feature descriptions, see [VISION.md](VISION.md).

---

## Priority Assessment

| # | Feature | Complexity | Impact | Priority |
|---|---------|-----------|--------|----------|
| A | ✅ Custom Drag-and-Drop Sorting | Medium | High | **Done** |
| D | ✅ File Status Indicators | Low | High | **Done** |
| E | ✅ Target-Specific Goals | Medium | High | **Done** |
| F | ✅ Writing Workspace | Low | Medium | **Done** |
| G | ✅ Folder / Chapter Goals | Low | High | **Done** |
| I | ✅ Flow Mode (formerly Zen Mode) | High | Medium | **Done** |
| J | ✅ Deadline Tracking & Writing Heatmap | Medium | High | **Done** |
| L | ✅ Rolling Daily Goals, Streak & Rest Days | Medium | High | **Done** |
| B | Project Compilation & Export | Medium | High | **P0** |
| C | File Splitting & Merging | Low–Medium | High | **P0** |
| H | Outline & Metadata Sidecar (Inspector) | High | Medium | **P1** |
| K | Stat Panel Color Polish | Low | Low | **P2** |

---

## Feature A — Custom Drag-and-Drop Sorting

**Status: ✅ Complete.** Custom sort order is implemented, tested, and shipped. This ordering is foundational for Manuscript Mode, Compilation, and Scene Card View (see [VISION.md](VISION.md) Phase 2–3).

### Checklist

- [x] **Data Model** — Add `fileOrder: string[]` to `Project` interface in `src/types/types.ts`. This array stores vault-relative file paths in user-defined order. Files not present in the array are appended to the bottom (new files auto-register).
- [x] **ProjectManager** — Add `reorderProjectFiles(projectId, newOrder: string[])` method that updates `fileOrder` and calls `updateProject`.
- [x] **ProjectExplorer.svelte** — Integrate a drag-and-drop library (recommend `svelte-dnd-action` which is lightweight and Svelte-native) on both Content and Source tree sections.
  - Dragging a file within a section reorders `fileOrder`.
  - Dragging a folder reorders at the folder level (all files inside move with it).
  - Visual drop indicator between items.
- [x] **buildProjectTree** — Sort nodes by `fileOrder` when constructing the tree. Files absent from `fileOrder` are appended at the end.
- [x] **Vault event handling** — On `rename`, update the path in `fileOrder`. On `delete`, remove from `fileOrder`.
- [x] **Tests** — Unit tests for `reorderProjectFiles` and sort logic.

### Notes
- `svelte-dnd-action` is MIT licensed and works well with Svelte 5 runes via `use:dndzone`.
- Store `fileOrder` as flat vault-relative paths (not relative to rootPath) to avoid ambiguity on renames.

---

## Feature B — Project Compilation & Export

**Why second:** Writers need a tangible output. This is a high-value, self-contained feature.

### Checklist

- [ ] **Compiler service** — Create `src/core/ProjectCompiler.ts`:
  - `compile(project: Project, order: string[]): Promise<string>` — concatenates content files in order.
  - Strip YAML frontmatter (reuse `WordCounter.removeFrontmatter`).
  - Strip `[[wiki links]]` → plain text (regex: `/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g` → use alias or link text).
  - Strip `![[embed]]` links or replace with a configurable separator.
  - Insert configurable section separator between files (default: `---`).
- [ ] **Compile modal** — `src/ui/modals/CompileModal.ts`:
  - Options: output filename, separator, include/exclude frontmatter strip, include/exclude wiki link strip.
  - Preview shows first ~500 chars of output.
  - "Save to vault" button → writes `.md` file to a user-chosen vault location.
- [ ] **Dashboard button** — Add "Compile Project" button to the Dashboard header actions area.
- [ ] **Command** — Register `compile-project` command in `main.ts`.
- [ ] **Pandoc integration (optional)** — If the Pandoc plugin (`obsidian-pandoc`) is installed, add a "Send to Pandoc" button that opens the output file in Pandoc's export dialog.
- [ ] **Tests** — Unit tests for `ProjectCompiler` covering frontmatter stripping, wiki link conversion, and separator insertion.

### Notes
- ePub / PDF generation is out of scope for initial implementation; the Pandoc handoff covers that.
- Output file should never be in a `contentFolder` (would pollute word count). Warn user if they pick a content folder as destination.

---

## Feature C — File Splitting & Merging

**Why third:** High utility, relatively low surface area. No new views needed.

### Checklist

- [ ] **Split at cursor** — Create `src/core/FileSplitter.ts`:
  - `splitAtCursor(file: TFile, cursorOffset: number): Promise<[TFile, TFile]>` — reads file content, splits at offset, writes first half back to original file, creates new file with second half.
  - Auto-names the new file: `{originalName} 2.md` (incrementing until unique).
  - Registers new file in project `fileOrder` immediately after the source file.
- [ ] **Command** — Register `split-note-at-cursor` in `main.ts`. Reads active editor cursor position.
- [ ] **Merge notes** — Add `mergeFiles(target: TFile, source: TFile): Promise<void>` to `FileSplitter.ts`:
  - Appends `source` content (frontmatter stripped) to `target` with a `---` separator.
  - Deletes `source`.
  - Removes `source` from `fileOrder`.
- [ ] **Context menu** — In `ProjectExplorer.svelte`, add "Merge into…" to the file right-click menu. Opens a fuzzy-suggest picker to choose the merge target.
- [ ] **Tests** — Unit tests for split and merge logic.

### Notes
- Split should preserve both halves' YAML frontmatter if present (copy frontmatter from original to both halves; let user clean up).
- Prompt for confirmation before merge (destructive operation).

---

## Feature D — File Status Indicators

**Status: ✅ Complete.**

### Checklist

- [x] **Data source** — Read `status:` field from file YAML frontmatter. No additional storage needed.
- [x] **Status color map** — `src/utils/fileStatus.ts` with `STATUS_COLORS` map (draft → red, revising → yellow, done → green). Unknown values fall back to `var(--text-faint)`.
- [x] **TreeNode.svelte** — Accepts optional `status` prop. Renders a filled circle dot (`.lh-status-dot`) before the file name when `status` is set.
- [x] **ProjectExplorer.svelte** — `buildProjectTree` reads frontmatter via `app.metadataCache.getFileCache(file)?.frontmatter?.status`.
- [x] **CSS** — `.lh-status-dot` style in `styles.css`.
- [x] **Tests** — Unit tests for `fileStatus.ts` colour mapping.

### Notes
- Use `metadataCache` not `vault.read` — zero I/O cost.
- Dots update automatically when the user changes `status:` in frontmatter because the metadata cache fires an event.

---

## Feature E — Target-Specific Goals ("At Most" / Per-File Goals)

**Status: ✅ Complete.**

### Checklist

- [x] **Data model** — `GoalDirection = 'at-least' | 'at-most'` type; `goalDirection?` and `fileGoals?: Record<string, number>` on `Project`.
- [x] **Dashboard** — Goal type toggle in `ProjectModal.ts`. Progress ring turns red when `totalWords > goal` under `at-most` mode.
- [x] **Per-file goal context menu** — "Set word goal…" in the ProjectExplorer file context menu; saves to `project.fileGoals[path]`.
- [x] **TreeNode.svelte** — Files with a goal show a small arc progress icon. Colour adapts to goal direction and completion state.
- [x] **Stats Panel** — Active file's "File Goal" progress bar shown when a per-file goal is set.
- [x] **Tests** — Unit tests for goal type logic and progress calculations.

---

## Feature F — Writing Workspace

**Status: ✅ Complete.**

Saves the current Obsidian layout, then opens a focused two-pane layout (Project Explorer left, editor centre). `exitWritingWorkspace` restores the saved layout.

### Checklist

- [x] **WorkspaceManager** — `src/core/WorkspaceManager.ts` with `enterWritingWorkspace()` / `exitWritingWorkspace()`.
- [x] **State persistence** — `workspaceActive?: boolean` flag in settings.
- [x] **Commands** — `open-writing-workspace` and `exit-writing-workspace` registered in `main.ts`.
- [x] **Tests** — Unit tests for workspace enter/exit state.

---

## Feature G — Folder / Chapter Goals

**Status: ✅ Complete.**

Per-folder word count targets. An amber progress ring appears next to each folder in the Project Explorer; hovering shows exact count vs target.

### Checklist

- [x] **Data model** — `folderGoals?: Record<string, number>` on `Project` (keyed by full vault-relative path).
- [x] **Project editor** — "Chapter Goals" section in `ProjectModal.ts`.
- [x] **TreeNode.svelte** — Folder nodes with a goal render a ring progress indicator.
- [x] **HierarchicalCounter** — Folder-level word count fed to ring calculation.
- [x] **Tests** — Unit tests for folder goal progress calculations.

---

## Feature J — Deadline Tracking & Writing Heatmap

**Status: ✅ Complete.**

Set a target finish date and a daily goal. The Stats Panel shows required words/day and 7-day average. The Dashboard shows a 13-week writing heatmap with five intensity levels.

### Checklist

- [x] **Data model** — `deadline?`, `dailyGoal?`, `dailyWordCounts?: Record<string, number>` on `Project`.
- [x] **deadlineUtils.ts** — `daysRemaining`, `requiredDaily`, `rollingAverage`, `heatmapDateKeys`, `localDateISO`; all timezone-safe (local time throughout).
- [x] **Stats Panel** — Pacing section: required words/day, days remaining, 7-day average, on-pace indicator.
- [x] **Dashboard heatmap** — 13-week SVG grid, five heat levels (0–4), tooltip on hover, clamped to prevent overflow.
- [x] **Dark mode** — `lh-heat-0` uses `color-mix` at 55% opacity for visibility.
- [x] **Tests** — 20 unit tests in `deadlineUtils.test.ts`.

---

## Feature L — Rolling Daily Goals, Streak & Rest Days

**Status: ✅ Complete.**

Adaptive daily pacing recalculates automatically based on surplus or missed days. Writing streaks track consecutive days. Rest days keep a streak alive without requiring words.

### Checklist

- [x] **Data model** — `daysOff?: string[]` (YYYY-MM-DD) on `Project`.
- [x] **computeStreak** — `deadlineUtils.ts` export returning `{ current, longest }`. Walks back 365 days; rest days count; tolerates in-progress days.
- [x] **Stats Panel** — Streak row with current streak, personal best sublabel, and "Mark rest day" / "Unmark rest day" toggle (only shown when today has no writing).
- [x] **Dashboard** — Streak stat cards below heatmap legend (amber current, muted personal best).
- [x] **Tests** — 9 new `computeStreak` tests in `deadlineUtils.test.ts`.

---

## Feature H — Outline & Metadata Sidecar (Inspector)

### Checklist

- [ ] **InspectorView** (`src/ui/views/InspectorView.ts` + `InspectorView.svelte`):
  - Registers as `lighthouse-inspector-view` in right sidebar.
  - Ribbon icon: `file-text` or `info`.
- [ ] **Synopsis field** — Reads/writes `synopsis:` frontmatter key on active file. Textarea with debounced save via `app.fileManager.processFrontMatter`.
- [ ] **Scratchpad** — Per-file notes stored in a dedicated section of `lighthouse.json` under `fileScratchpads: Record<string, string>`. Not written to the vault file itself.
- [ ] **Character/location links** — Scans the active file's content for `[[links]]`. Filters to only links that resolve to files inside the active project's `sourceFolders`. Renders as clickable chips.
- [ ] **Register view** in `main.ts`.
- [ ] **Command** — `open-inspector` command.
- [ ] **Tests** — Unit tests for frontmatter read/write helpers.

---

## Feature I — Flow Mode (formerly Zen Mode)

**Status: ✅ Complete.** Note: focus-mode paragraph dimming was prototyped and then removed; the other items shipped.

### Checklist

- [x] **Typewriter scroll** — `flowTypewriterScroll` setting; uses `workspace.on('editor-change')` to scroll active line to centre. Listener cleaned up on exit.
- [x] **Typography overrides** — `flowFont`, `flowLineHeight`, `flowLineWidth` settings injected as CSS variables (`--lh-flow-font`, `--lh-flow-line-height`, `--lh-flow-line-width`) via a style element on enter; removed on exit.
- [x] **Hide status bar / ribbon** — `flowModeHideStatusBar` and `flowModeHideRibbon` settings.
- [x] **Settings tab** — "Flow Mode" subsection in `SettingsTab.ts`.
- [x] **Tests** — Unit tests for enter/exit state, CSS variable injection, and cleanup logic.
- [ ] ~~**Focus mode (dim non-active paragraph)**~~ — Prototyped and removed; reliable CodeMirror paragraph tracking proved too fragile across Obsidian versions.

---

## Feature K — Stat Panel Color Polish

### Checklist

- [ ] In `StatsPanel.svelte`, derive a `sessionDeltaClass` computed value:
  - `'lighthouse-stat-positive'` when `sessionWordCount > 0`
  - `'lighthouse-stat-negative'` when `sessionWordCount < 0` (heavy editing session)
  - `'lighthouse-stat-neutral'` when `= 0`
- [ ] Add CSS classes in `StatsPanel.svelte` `<style>` block:
  ```css
  .lighthouse-stat-positive { color: var(--color-green); }
  .lighthouse-stat-negative { color: var(--color-red); }
  .lighthouse-stat-neutral  { color: var(--text-muted); }
  ```
- [ ] Apply same treatment to `todayWordCount`.

---

## Implementation Order (Recommended)

```
Shipped
  A  ✅ Custom Sorting
  D  ✅ File Status Indicators
  E  ✅ Target-Specific Goals
  F  ✅ Writing Workspace
  G  ✅ Folder / Chapter Goals
  I  ✅ Flow Mode
  J  ✅ Deadline Tracking & Heatmap
  L  ✅ Rolling Daily Goals, Streak & Rest Days

Next Up
  B  Project Compilation & Export   ← tangible writer output, high value
  C  File Splitting & Merging       ← no new views, pure utility
  K  Stat Panel Color Polish        ← tiny, bundle with C or B
  H  Inspector / Metadata Sidecar   ← power feature for novel / thesis writers
```

*For Manuscript Mode, Scene Cards, Analytics, and Knowledge Integration, see [VISION.md](VISION.md).*

---

## Architecture Notes

### New files to create
| Path | Purpose |
|------|---------|
| `src/core/ProjectCompiler.ts` | Compilation engine |
| `src/core/FileSplitter.ts` | Split/merge operations |
| `src/ui/views/InspectorView.ts` + `.svelte` | File inspector panel |
| `src/ui/modals/CompileModal.ts` | Compile options UI |

### Already created (reference)
| Path | Purpose |
|------|---------|
| `src/utils/fileStatus.ts` | Status colour map ✅ |
| `src/core/FlowMode.ts` | Flow Mode (formerly ZenMode) ✅ |
| `src/core/WorkspaceManager.ts` | Writing workspace enter/exit ✅ |
| `src/utils/deadlineUtils.ts` | Deadline + heatmap + streak maths ✅ |

### Types still to extend (`src/types/types.ts`)
- (none — all planned extensions are shipped)

### Settings still to extend (`src/types/settings.ts`)
- (none — all planned extensions are shipped)
