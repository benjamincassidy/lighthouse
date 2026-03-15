# Lighthouse — Upcoming Features

This document tracks planned features, implementation details, and their completion status.
Features are grouped by theme and ordered by recommended implementation priority.

---

## Priority Assessment

| # | Feature | Complexity | Impact | Priority |
|---|---------|-----------|--------|----------|
| A | Custom Drag-and-Drop Sorting | Medium | High | **P0** |
| B | Project Compilation & Export | Medium | High | **P0** |
| C | File Splitting & Merging | Low–Medium | High | **P0** |
| D | File Status Indicators | Low | High | **P1** |
| E | Target-Specific Goals | Medium | High | **P1** |
| F | Deadline & Velocity Tracking | Medium | High | **P1** |
| G | Document Stitching (Continuous View) | High | Very High | **P1** |
| H | Outline & Metadata Sidecar (Inspector) | High | Medium | **P2** |
| I | Next-Level Zen Mode | High | Medium | **P2** |
| J | Dashboard Activity Feed / Heatmap | Medium | Medium | **P2** |
| K | Stat Panel Color Polish | Low | Low | **P3** |

---

## Feature A — Custom Drag-and-Drop Sorting

**Why first:** Unlocks correct ordering for Document Stitching and Compilation. Everything else depends on order.

### Checklist

- [ ] **Data Model** — Add `fileOrder: string[]` to `Project` interface in `src/types/types.ts`. This array stores vault-relative file paths in user-defined order. Files not present in the array are appended to the bottom (new files auto-register).
- [ ] **ProjectManager** — Add `reorderProjectFiles(projectId, newOrder: string[])` method that updates `fileOrder` and calls `updateProject`.
- [ ] **ProjectExplorer.svelte** — Integrate a drag-and-drop library (recommend `svelte-dnd-action` which is lightweight and Svelte-native) on both Content and Source tree sections.
  - Dragging a file within a section reorders `fileOrder`.
  - Dragging a folder reorders at the folder level (all files inside move with it).
  - Visual drop indicator between items.
- [ ] **buildProjectTree** — Sort nodes by `fileOrder` when constructing the tree. Files absent from `fileOrder` are appended at the end.
- [ ] **Vault event handling** — On `rename`, update the path in `fileOrder`. On `delete`, remove from `fileOrder`.
- [ ] **Tests** — Unit tests for `reorderProjectFiles` and sort logic.

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

**Why fourth:** Pure UI polish, low effort, high perceived quality.

### Checklist

- [ ] **Data source** — Read `status:` field from file YAML frontmatter. No additional storage needed.
- [ ] **Status color map** — Define in `src/utils/fileStatus.ts`:
  ```ts
  export const STATUS_COLORS: Record<string, string> = {
    draft:    'var(--color-red)',
    revising: 'var(--color-yellow)',
    done:     'var(--color-green)',
  }
  ```
  Unknown values fall back to `var(--text-faint)`.
- [ ] **TreeNode.svelte** — Accept optional `status` prop. Render a 6px filled circle dot before the file name when `status` is set.
- [ ] **ProjectExplorer.svelte** — In `buildProjectTree`, read frontmatter via `app.metadataCache.getFileCache(file)?.frontmatter?.status` (no file reads required — metadata cache is synchronous).
- [ ] **CSS** — Add `.lighthouse-status-dot` style to `styles.css`.
- [ ] **Tests** — Unit test for `fileStatus.ts` color mapping.

### Notes
- Use `metadataCache` not `vault.read` — zero I/O cost.
- Dots update automatically when the user changes `status:` in frontmatter because the metadata cache fires an event.

---

## Feature E — Target-Specific Goals ("At Most" / Per-File Goals)

### Checklist

- [ ] **Data model changes** in `src/types/types.ts`:
  - Add `wordCountGoalType?: 'at-least' | 'at-most'` to `Project`.
  - Add `fileGoals?: Record<string, number>` to `Project` (keyed by vault-relative path).
- [ ] **Dashboard** — Add a "Goal type" toggle (At least / At most) next to the word count goal input in `ProjectModal.ts`. Progress ring turns red when `totalWords > goal` under `at-most` mode.
- [ ] **Per-file goal context menu** — In `ProjectExplorer.svelte` context menu for files, add "Set word goal…" item. Opens a small modal with a number input. Saves to `project.fileGoals[path]`.
- [ ] **TreeNode.svelte** — When a file has a goal set in `fileGoals`, show a small pie/arc icon next to the name. Color: green if within goal, red if over (for `at-most`) or under (for `at-least`).
- [ ] **Stats Panel** — When active file has a per-file goal, show a "File Goal" progress bar below "Current File".
- [ ] **Tests** — Unit tests for goal type logic and progress calculations.

---

## Feature F — Deadlines & Velocity Tracking

### Checklist

- [ ] **Data model** — Add to `Project` in `src/types/types.ts`:
  ```ts
  deadline?: string            // ISO date YYYY-MM-DD
  writingHistory?: Record<string, number> // date → total project word count snapshot
  ```
- [ ] **ProjectManager** — On each word count update (triggered by `editor-change` in StatsPanel), snapshot today's total into `writingHistory[today]`. Persist via `updateProject`.
- [ ] **Velocity calculation** — Create `src/utils/velocity.ts`:
  - `wordsRemaining(project)` → `goal - currentTotal`
  - `daysRemaining(deadline)` → calendar days until deadline (excluding today)
  - `requiredDailyVelocity(project, currentTotal)` → `wordsRemaining / daysRemaining`
  - `averageDailyVelocity(history, days = 7)` → average over last N days
- [ ] **Dashboard** — Add a "Deadline" section below the goal ring when `deadline` is set:
  - Deadline date
  - Days remaining
  - Required daily words to stay on track
  - Average daily velocity (7-day)
- [ ] **ProjectModal.ts** — Add deadline date picker field.
- [ ] **Writing Heatmap component** — Create `src/ui/components/WritingHeatmap.svelte`:
  - GitHub-style 52-column × 7-row grid.
  - Each cell represents one day; color intensity based on words written that day relative to required daily velocity.
  - Tooltip on hover: date and word count.
  - Add to Dashboard below the stats section.
- [ ] **Stats Panel** — Add "Est. Read Time" and "Est. Speak Time" to the project stats section:
  - Read: `Math.ceil(totalWords / 250)` minutes
  - Speak: `Math.ceil(totalWords / 130)` minutes
- [ ] **Tests** — Unit tests for all `velocity.ts` functions.

### Notes
- `writingHistory` snapshots only need daily granularity. Snapshot on every `editor-change` is fine — just overwrite today's entry.
- Keep heatmap data in the project object (no separate storage).

---

## Feature G — Document Stitching (Continuous View)

**Complexity note:** This is the most architecturally complex feature. Plan carefully before starting.

### Approach

Use a **read-only compiled preview** with a **per-file editor** approach rather than a true multi-file editor (which would require a custom CodeMirror instance). This matches what most Ulysses users actually need: read the flow, then click to edit the specific file.

### Checklist

- [ ] **Selection in ProjectExplorer** — Support multi-select:
  - `Cmd+click` toggles individual file selection.
  - Clicking a section header selects all files in that section.
  - Store `selectedPaths: Set<string>` in `$state`.
  - Show selection count badge in the explorer header when >1 file selected.
- [ ] **"View Combined" button** — Appears in the explorer header when ≥2 files are selected. Opens the Stitch View.
- [ ] **StitchView** (`src/ui/views/StitchView.ts` + `StitchView.svelte`):
  - Registers as a new Obsidian view type `lighthouse-stitch-view`.
  - Renders files in order (using `fileOrder`) as concatenated Markdown via Obsidian's `MarkdownRenderer.render()` API.
  - Each file section has a subtle header separator showing the filename.
  - Clicking anywhere in a file's section opens that file in the main editor.
  - "Edit [filename]" button floats at top of each file section on hover.
- [ ] **Folder stitching** — Right-clicking a folder in the explorer offers "View as continuous document". Stitches all files within that folder in sorted order.
- [ ] **Command** — `stitch-selected-files` — stitches currently selected files.
- [ ] **Register view** in `main.ts`.
- [ ] **Tests** — Integration test for file ordering and rendering logic.

### Notes
- Do **not** attempt live two-way editing across files — this path leads to enormous complexity and bugs.
- `MarkdownRenderer.render()` handles wikilinks, embeds, and callouts correctly.
- The StitchView is intentionally read-only; double-clicking a section opens the source file for editing.

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

## Feature I — Next-Level Zen Mode

### Checklist

- [ ] **Typewriter scroll** — In `ZenMode.ts`, on `enterZenMode`, add a `scroll` event listener to the active editor's CodeMirror instance that calls `editor.scrollIntoView(cursor, 'center')` after each keystroke. Remove listener on `exitZenMode`.
  - Obsidian exposes the active editor via `app.workspace.activeEditor?.editor`.
- [ ] **Focus mode (dim non-active paragraph)** — Inject a CSS class `lighthouse-zen-focus` on the editor container. Use a CodeMirror `EditorView.updateListener` to track cursor position and apply a CSS highlight to the paragraph under cursor while dimming others via `opacity: 0.3` on all other `.cm-line` elements.
  - Add a setting: `zenFocusMode: 'none' | 'sentence' | 'paragraph'`.
- [ ] **Zen typography overrides** — Add settings:
  - `zenFont: string` (CSS font-family)
  - `zenLineHeight: number`
  - `zenLineWidth: number` (max line width in characters or px)
  - On `enterZenMode`, inject a `<style id="lighthouse-zen-typography">` element with these values targeting `.cm-editor`. Remove on `exitZenMode`.
- [ ] **Settings tab** — Add a "Zen Mode — Focus & Typography" subsection to `SettingsTab.ts`.
- [ ] **Tests** — Unit tests for CSS injection/cleanup logic.

---

## Feature J — Dashboard Activity Feed & Writing Heatmap

*Note: Heatmap is also part of Feature F. Implement together.*

### Checklist

- [ ] **Activity log** — Add `activityLog?: ActivityEntry[]` to `Project`:
  ```ts
  interface ActivityEntry {
    timestamp: string  // ISO datetime
    type: 'create' | 'edit' | 'rename' | 'delete'
    filePath: string
  }
  ```
  Cap log at 50 most recent entries. Write via vault event listeners in `main.ts`.
- [ ] **Activity feed component** — `src/ui/components/ActivityFeed.svelte`:
  - Shows last 5–10 entries: "{action} {filename} {relative time}" (e.g., "Edited Chapter 3 · 2 hours ago").
  - Relative time via a small `formatRelativeTime(isoString)` utility.
- [ ] **Dashboard integration** — Replace the empty stats area below the stats grid with the `ActivityFeed` component when no heatmap is shown.
- [ ] **Tests** — Unit tests for `formatRelativeTime`.

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
Phase 1 (Foundation)
  A  Custom Sorting          ← enables correct ordering for everything else
  D  File Status Indicators  ← zero dependencies, high polish payoff
  K  Stat Panel Colors       ← tiny, ship alongside Phase 1

Phase 2 (Core Productivity)
  C  File Splitting & Merging
  B  Project Compilation & Export
  E  Target-Specific Goals

Phase 3 (Engagement Loop)
  F  Deadlines & Velocity + Heatmap
  J  Dashboard Activity Feed   ← shares data infrastructure with F

Phase 4 (Power Features)
  G  Document Stitching
  H  Inspector / Metadata Sidecar
  I  Next-Level Zen Mode
```

---

## Architecture Notes

### New files to create
| Path | Purpose |
|------|---------|
| `src/core/ProjectCompiler.ts` | Compilation engine |
| `src/core/FileSplitter.ts` | Split/merge operations |
| `src/utils/fileStatus.ts` | Status color map |
| `src/utils/velocity.ts` | Deadline math |
| `src/ui/views/StitchView.ts` + `.svelte` | Continuous document view |
| `src/ui/views/InspectorView.ts` + `.svelte` | File inspector panel |
| `src/ui/components/WritingHeatmap.svelte` | GitHub-style heatmap |
| `src/ui/components/ActivityFeed.svelte` | Recent activity list |
| `src/ui/modals/CompileModal.ts` | Compile options UI |

### Types to extend (`src/types/types.ts`)
- `Project.fileOrder?: string[]`
- `Project.wordCountGoalType?: 'at-least' | 'at-most'`
- `Project.fileGoals?: Record<string, number>`
- `Project.deadline?: string`
- `Project.writingHistory?: Record<string, number>`
- `Project.activityLog?: ActivityEntry[]`
- New interface: `ActivityEntry`

### Settings to extend (`src/types/settings.ts`)
- `zenFocusMode: 'none' | 'sentence' | 'paragraph'`
- `zenFont: string`
- `zenLineHeight: number`
- `zenLineWidth: number`
