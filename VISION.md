# Lighthouse — Product Vision & Roadmap

> The premier long-form writing environment inside Obsidian.

Lighthouse is not another Obsidian utility plugin. It is a **cohesive writing system**: project organization, writing flow, structure management, and progress visibility all working together — designed to feel less like a plugin and more like a writing application that happens to live inside Obsidian.

---

## Core Vision

Lighthouse combines:

- the **clean writing experience** of Ulysses
- the **structural organization** of Scrivener
- the **knowledge graph power** of Obsidian

It is simultaneously a manuscript development environment, a writing habit tracker, a story structure tool, and a research-integrated writing space. No single writing application does all four today.

---

## Core Pillars

### 1. Focused Writing

Writers need an environment that removes friction from the act of writing.

- Minimal, quiet UI during writing sessions
- Clear, fast progress feedback
- Distraction-free editing modes
- Sprint mode for timed drafting bursts

*Features: Zen Mode, Sprint Mode, Dialogue Focus Mode, Session Analytics*

---

### 2. Manuscript Structure

Long-form writing requires structure without rigidity.

- Chapter and scene organization
- Scene card and corkboard views
- File-level metadata and status tracking
- Outline navigation and section reordering

*Features: Scene Card View, Outline View, Inspector, File Status Indicators, Manuscript Mode*

---

### 3. Writing Momentum

Many writers struggle with consistency. Lighthouse should actively support writing habits.

- Daily writing heatmaps and streak tracking
- Progress rings with goal completion feedback
- Deadline-aware velocity tracking
- Sprint and session summaries

*Features: Writing Heatmap, Deadline Tracking, Rolling Daily Goals, Writing Analytics Dashboard, Sprint Mode*

---

### 4. Knowledge Integration

This is where Lighthouse can outperform every other writing tool. Scrivener and Ulysses treat writing and research as separate worlds. Obsidian does not.

- Research notes linked to manuscript sections
- Character and location notes surfaced automatically from cursor context
- Narrative graphs showing scene and character relationships
- Backlink awareness scoped to the active project

*Features: Narrative Graph, Auto-Surfacing Story Bible, Knowledge-Driven Explorer*

---

## Differentiation

### Lighthouse vs Ulysses

Ulysses has a polished, minimal writing experience and good project organization. It lacks research integration, meaningful analytics, structural tools beyond folders, and any extensibility. Lighthouse matches Ulysses simplicity while surpassing its flexibility through Obsidian's knowledge graph, writing analytics, and community extensibility.

### Lighthouse vs Scrivener

Scrivener has the deepest manuscript structure available — corkboard, binder, compile. But its interface is complex, it has no knowledge linking, and its UI patterns are dated. Lighthouse delivers Scrivener-level structure without Scrivener-level complexity, and adds the research-linking layer Scrivener never had.

### Lighthouse vs iA Writer

iA Writer excels at minimalist focus. It has no project management, no analytics, and no organization tools beyond folders. Lighthouse combines iA Writer's focus with manuscript-scale structure and writing metrics.

---

## Design Principles

### 1. Writing Workspace Ownership

Lighthouse should control a dedicated writing layout when activated, not open individual panels into wherever Obsidian left off. An "Open Writing Workspace" command configures the full interface:

```
Explorer  |  Editor  |  Writing Stats
```

Workspace presets adapt the layout to the current writing mode:

| Preset | Left | Main | Right |
|---|---|---|---|
| Writing | Explorer | Editor | Stats |
| Planning | Explorer | Scene Cards | Outline |
| Editing | Explorer | Manuscript | Stats |
| Research | Explorer | Editor | Backlinks |

Writers should feel like they entered a writing environment, not opened another panel.

### 2. Visual Identity

Lighthouse introduces consistent visual identity elements across all components — distinctive progress rings, consistent iconography, subtle accent colors for writing metrics, and consistent heading typography. These elements create a recognizable product identity that feels intentional, not assembled.

### 3. Fluid UI Behavior

Premium experience comes from small details: progress rings animate, word count numbers increment, stats update without flicker, folder expansion has transitions. These micro-interactions signal that the software is doing real work reliably.

### 4. Context-Aware Interfaces

The interface should respond to writing context:

- **Editing a scene:** file word count, chapter progress, project progress
- **Editing research notes:** backlinks to manuscript sections, character reference cards
- **Working in outline mode:** section structure tools, scene card access

The UI adapts to what the writer is doing, not the other way around.

### 5. Minimal Configuration

Sensible defaults, progressive feature discovery, and optional advanced settings. The best user experience is when most writers never open the settings panel.

### 6. Integrated Workflows

Features reinforce each other. Example flow: writer starts sprint → session tracker activates → words contribute to daily heatmap → progress ring updates → sprint summary appears on completion. Multiple systems form one coherent experience.

---

## Guiding Philosophy

Every Lighthouse feature should support one goal:

> **Help writers move from blank page to finished manuscript with clarity and momentum.**

If a feature does not directly contribute to writing clarity or writing momentum, it should be reconsidered.

---

## Roadmap

### Completed ✅

- Project creation, editing, deletion with folder-based structure
- Content vs source folder distinction (counting vs non-counting)
- Project-scoped file explorer with tree view and vault events
- Writing stats panel with today's word count and session tracking
- Zen mode (sidebar/ribbon/status bar toggle)
- Custom drag-and-drop file ordering in the Project Explorer

---

### Phase 1 — Core Writing Experience

*Foundation layer. These build the session data infrastructure everything else depends on.*

**1. Sprint Mode**
Timed writing sessions with real-time countdown, configurable duration (10 / 15 / 20 / 30 min or custom), end-of-sprint summary (words written, WPM, session duration), and sprint history logging. Integrates with InspectorView in the right sidebar. Neither Scrivener nor Ulysses has native sprint tooling.

**2. Session Analytics (`WritingSessionTracker`)**
Extract session tracking from `StatsPanel.svelte` into a dedicated `src/core/WritingSessionTracker.ts` service. Owns today's word count baseline, session start time, words-this-session delta, and daily snapshot history. All other features (Sprint Mode, Heatmap, Analytics Dashboard) consume this service rather than duplicating the logic. This is a prerequisite for Phase 4.

**3. Next-Level Zen Mode**
- Typewriter scroll: active line stays vertically centered as the writer types
- Paragraph focus mode: current paragraph at full opacity, all others dimmed (configurable: sentence / paragraph / none)
- Dialogue focus mode: everything outside quotation marks fades; supports straight and smart quotes
- Typography overrides in Zen: configurable font, line height, and max line width injected as a scoped style element, removed on exit
- Settings subsection: "Zen Mode — Focus & Typography"

**4. File Status Indicators**
Read `status:` from file YAML frontmatter via `metadataCache` (zero I/O). Render a small colored dot before the filename in the Explorer tree. Status color map: `draft` → red, `revising` → yellow, `done` → green. Unknown values fall back to muted. Dots update automatically when frontmatter changes.

**5. Stat Panel Color Polish**
Session word delta displayed in context: positive (green), negative (red), zero (muted). Same treatment for today's word count relative to daily goal.

---

### Phase 2 — Manuscript & Workspace

*Shape Lighthouse into a destination, not a collection of panels.*

**6. Writing Workspace (WorkspaceManager)**
A `WorkspaceManager` service that saves the user's pre-Lighthouse workspace layout, applies a named Lighthouse layout preset, and restores the original layout on exit. Ribbon icon and "Open Writing Workspace" command as the primary entry point. `main.ts` panel-opening methods become private helpers called by the manager.

**7. Manuscript Mode (Continuous View)**
A new `ItemView` that renders all project content files — in custom sort order — as a single scrollable read-only document using Obsidian's `MarkdownRenderer.render()` API. Each file section has a subtle separator showing the filename. Clicking anywhere in a section opens that source file in the main editor. Intentionally read-only; true multi-file editing deferred to Long-Term.

**8. Folder / Chapter Word Goals**
Per-folder word count goals (`folderGoals?: Record<string, number>` on `Project`). Progress rings visible beside folder names in the Explorer. Aggregated up to the project-level goal ring. Optional auto-distribution: set project goal and let Lighthouse divide it evenly across chapters.

**9. Target-Specific Goals**
- Goal type toggle (at-least / at-most) per project. Progress ring turns red when over goal in at-most mode.
- Per-file goals (`fileGoals?: Record<string, number>` keyed by vault path). Set via context menu in the Explorer. Shown as a small arc icon on the file row and as a separate progress bar in the Stats Panel when that file is active.

**10. Project Compilation & Export**
A `ProjectCompiler` service that concatenates content files in custom sort order, strips YAML frontmatter, converts `[[wiki links]]` to plain text, and inserts a configurable section separator between files. A compile modal handles output filename, separator choice, and preview. Output writes to a user-chosen vault location (with a warning if targeting a content folder). Optional Pandoc handoff when the Pandoc plugin is present.

**11. File Splitting & Merging**
- Split at cursor: reads the active file, splits at the cursor offset, writes the first half back, creates a new file with the second half named `{original} 2.md`. New file registers in `fileOrder` immediately after the source.
- Merge: appends one file's content (frontmatter stripped) to another behind a `---` separator, deletes the source, removes it from `fileOrder`. Triggered from context menu with a file picker. Confirmation required.

---

### Phase 3 — Structure & Organization

*Give writers the structure tools that long-form writing demands.*

**12. Scene Card View (Corkboard)**
A grid view where each file appears as a scene index card showing the filename and the `synopsis:` frontmatter field (falls back to the file's first non-frontmatter line). Drag cards to reorder scenes; the reorder propagates back to `fileOrder`. **Canvas integration:** a "Corkboard" button on folder rows auto-generates an Obsidian Canvas file with one card per note. When the writer reorders cards on the Canvas, Lighthouse detects the change and updates `fileOrder` to match.

**13. Outline View**
A hierarchical heading tree built from `metadataCache.getFileCache(file)?.headings` (zero I/O, fires on cache update). Shows file → heading → subheading hierarchy. Jump-to-section navigation. Drag-to-reorder files (reuses `fileOrder`). Heading-level reorder within a file writes the reordered content back to the source file.

**14. Inspector / Metadata Sidecar**
Right-sidebar panel for the active file:
- `synopsis:` front matter field with a live-editing textarea (debounced save via `app.fileManager.processFrontMatter`)
- Per-file scratchpad stored in plugin data (not in the vault file)
- Character and location link chips: scans active file for `[[links]]` resolving to the project's Source folders and renders them as clickable chips

**15. Project Snapshots (Scene-Level Version Control)**
A camera icon in the Explorer takes a timestamped snapshot of the active file. Snapshots are stored outside vault content in a plugin-managed folder (never appear in search or sync as notes). A "History" tab lists snapshots with timestamps. Restore replaces current file content (with confirmation). Compare shows a diff view. When Project-Scoped Find & Replace is active, offer to auto-snapshot all affected files before replacing.

**16. Project-Scoped Find & Replace**
Search and replace scoped exclusively to the active project's Content folders. UI: find field, replace field, case-sensitive and whole-word toggles, match preview with filename and context. "Replace All" with confirmation prompt. Summary after completion: "Replaced 47 instances across 12 files."

---

### Phase 4 — Momentum & Analytics

*Make progress visible and motivating without gamification overload.*

**17. Writing Heatmap**
GitHub-style 52×7 grid showing daily word counts. Color intensity relative to daily goal or required velocity. Hover tooltip: date and word count. Writing streak detection (consecutive days above baseline). Streak calendar beside the heatmap. Uses `WritingSessionTracker` daily snapshots as its data source.

**18. Deadline & Velocity Tracking**
`deadline?: string` on `Project`. Dashboard section when deadline is set: deadline date, days remaining, required daily words to stay on track, 7-day average velocity. `ProjectModal` adds a deadline date field. Velocity utilities: `wordsRemaining`, `daysRemaining`, `requiredDailyVelocity`, `averageDailyVelocity`.

**19. Rolling Daily Goals (Adaptive Velocity)**
When a writer exceeds the daily target, carry the surplus forward — tomorrow's required count proportionally decreases. When a writer misses a day, redistribute missed words across remaining days rather than compounding. Planned days off can be marked without breaking the streak or redistributing. Tomorrow's adjusted target shown on the Dashboard. Builds on Deadline Tracking.

**20. Writing Analytics Dashboard**
Project analytics view consuming `WritingSessionTracker` + `HierarchicalCounter`:
- Writing velocity (words/hour, words/day, 7-day average)
- Words per chapter / folder
- Cumulative progress toward goal
- Estimated completion date at current velocity
- Sprint history chart (output per sprint over time)
- Session summary cards (most recent sessions)

---

### Phase 5 — Knowledge Integration

*Leverage the capability that no standalone writing app can match.*

**21. Narrative Graph**
Force-directed graph visualization of manuscript relationships. Nodes: scenes, characters, locations, research notes. Edges derived from `metadataCache.resolvedLinks`, filtered to nodes within the active project. Minimal D3 force layout. Clicking a node opens the file. Intended as an overview and navigation tool, not a full knowledge graph replacement.

**22. Auto-Surfacing Story Bible (Context Pane)**
As the writer types, scan the current paragraph for `[[wiki links]]` resolving to the active project's Source folders. Automatically display those linked character/location/reference sheets inline in the right sidebar — no clicking required. Updates in real time as the cursor moves between paragraphs. Writers can pin a reference card to keep it visible when the cursor moves away.

**23. Vocabulary & Style Insights**
Optional text analysis tools run against the active file or full project:
- Repeated word / phrase detection
- Sentence length histogram
- Readability metrics (Flesch–Kincaid)
- Dialogue percentage
- Adverb density
All implemented as pure functions in `src/utils/` with no Obsidian API dependency — fully testable.

---

### Long-Term

**True Editable Manuscript Mode**
Building on Manuscript Mode's read-only view: a custom CodeMirror 6 extension that constructs a virtual multi-file document, intercepts all change transactions, maps character positions back to source files, and applies edits there. Significant standalone engineering project. Planned after Manuscript Mode (read-only) ships and proves the concept.

**Workspace Presets (Save / Restore)**
Beyond built-in presets: let writers save their current workspace layout as a named preset and recall it via command. Uses `workspace.getLayout()` / `workspace.setLayout()`. Pairs with WorkspaceManager.

---

## Architecture Notes

The following structural improvements are prerequisites for or closely tied to specific roadmap phases:

**`WritingSessionTracker` extraction (Phase 1 prerequisite)**
Today's word count baseline and session tracking currently live inside `StatsPanel.svelte`. This must move to `src/core/WritingSessionTracker.ts` before Sprint Mode or any Phase 4 analytics can share a data foundation cleanly.

**Word count caching (Phase 4 prerequisite)**
`HierarchicalCounter.countProject()` traverses all content files on every call with no result cache. Add a `Map<path, { words: number; mtime: number }>` cache invalidated by vault `modify` events. Required before the Analytics Dashboard can display real-time stats without lag on large projects.

**`WorkspaceManager` (Phase 2 prerequisite)**
`main.ts` panel-opening logic (`activateDashboard`, `activateProjectExplorer`, `activateStatsPanel`) moves into `src/core/WorkspaceManager.ts`. Enables layout presets and the Writing Workspace command without `main.ts` growing further.

**`VaultEventService` (Phase 3 desirable)**
`ProjectExplorer.svelte` and `StatsPanel.svelte` each register independent vault event listeners. A centralized `VaultEventService` deduplicates subscriptions, normalizes event shapes, and simplifies per-component subscription. Not blocking for any single feature but becomes important once Phase 3 adds more vault-watching views.

**Feature module pattern (Phase 2+)**
Each major feature should expose an `init(plugin)` entry point and live in `src/features/{name}/`. Keeps `main.ts` clean as the feature count grows. Sprint Mode is a good first candidate for this pattern.
