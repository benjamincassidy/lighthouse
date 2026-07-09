# Lighthouse Plugin - Copilot Instructions

## Project Overview
Lighthouse is a shipped, actively-maintained Obsidian plugin for project-based, long-form writing, inspired by Ulysses. It's listed on the community plugin directory (community.obsidian.md/plugins/lighthouse). This file describes the actual current architecture — check the code before assuming anything here is still accurate, but it should be a reliable starting map.

## Architecture & Tech Stack

**Core Technologies:**
- TypeScript (strict mode)
- Svelte 5 (runes) for UI components
- esbuild for builds (with `esbuild-svelte`)
- Obsidian Plugin API
- Svelte stores for state management
- Pandoc + Typst (downloaded on demand) for DOCX/EPUB and PDF export

**Module Structure:**
- `src/core/` — business logic: `ProjectManager`/`ProjectStorage` (CRUD + persistence), `WordCounter`/`HierarchicalCounter` (counting), `FolderManager` (path resolution, Extras detection), `WorkspaceManager` (Writing Workspace layout), `FlowMode`, `WritingSessionTracker`, `FileSplitter`, `ProjectCompiler`, `exporters/` (PDF/DOCX/EPUB), `tools/` (Pandoc/Typst binary management)
- `src/ui/views/` — the two main panels: `ProjectExplorer.svelte` (the **Library**, left sidebar) and `Inspector.svelte` (right sidebar, with `OverviewTab`/`StatsTab`/`OutlineTab`)
- `src/ui/modals/` — `ProjectModal`, `GroupModal`, `ExportModal`, `FileGoalModal`, `MergeModal`, `ConfirmModal`, etc.
- `src/ui/components/` — shared Svelte components (`TreeNode`, `SheetCard`, `SheetList`, …)
- `src/ui/menus/` — right-click context menu builders
- `src/utils/` — pure utility functions (no Obsidian API dependency where possible)
- `src/types/` — TypeScript interfaces (`Project` etc.)

## Key Architectural Decisions

### The Writing Workspace
`WorkspaceManager` owns entering/exiting a dedicated layout: the Library in the left sidebar, the Inspector in the right sidebar, Obsidian's native file explorer detached for the duration and restored on exit. Toggled via the ribbon icon or the `Lighthouse: Open/Exit writing workspace` commands.

### Groups & Extras (not "content/source folders")
A project is a single root folder. Every subfolder under the root is a **Group** shown in the Library, and can nest. One subfolder is designated **Extras** (auto-provisioned, default name `Extras`) and is excluded from word counts — this replaced an earlier `contentFolders`/`sourceFolders` array design; don't reintroduce that model.

### Data Ownership
- User data stays in standard markdown files
- No vendor lock-in — projects are just a root folder pointer
- Project metadata stored in `<vault>/.obsidian/lighthouse.json` (see `ProjectStorage.ts` — a custom path, not the default per-plugin `data.json`)
- Vault-relative paths for portability

### Performance Strategy
- Word counting: debounced (`WordCounter`), with `HierarchicalCounter` aggregating file → group → project
- Hierarchical calculation avoids redundant re-reads where possible

### State Management
- Svelte stores for reactive state (`src/core/stores.ts`)
- Active project ID persists in `lighthouse.json`

## Core Data Model

See `src/types/types.ts` for the authoritative `Project` interface. Key shape (abbreviated):

```typescript
interface Project {
  id: string
  name: string
  rootPath: string              // Vault-relative
  extrasFolder?: string         // Single subfolder excluded from word counts
  wordCountGoal?: number
  goalDirection?: 'at-least' | 'at-most'
  folderGoals?: Record<string, number>   // per-group goals
  folderIcons?: Record<string, string>   // per-group icon IDs
  fileGoals?: Record<string, number>     // per-file goals
  fileOrder?: string[]                   // custom sheet/group order
  deadline?: string
  dailyGoal?: number
  dailyWordCounts?: Record<string, number>  // heatmap/streak source
  daysOff?: string[]
  bibliographyPath?: string
  citationStyle?: string
  lastExportSettings?: LastExportSettings
}
```

**There is no `contentFolders`/`sourceFolders` distinction anymore.** Everything under `rootPath` counts except the single `extrasFolder`.

## Development Workflow

1. **Build:** `npm run dev` (watch mode) or `npm run build` (production, type-checks first)
2. **Testing:** `npm test` (Vitest, `environment: 'node'`, pure-logic tests only — Svelte components aren't unit tested) + manual testing in an Obsidian dev vault
3. **Lint:** `npm run lint` (ESLint with `eslint-plugin-obsidianmd` — keep this package current, its rules track Obsidian's own review bot)
4. **Screenshots:** `npm run screenshots` regenerates the store-listing screenshots via a Playwright-driven demo vault (see `scripts/screenshots/`)

**Import Paths:** path aliases via `tsconfig.json` — `@/core/*`, `@/ui/*`, `@/utils/*`, `@/types/*`.

## Project-Specific Patterns

### Obsidian API version guards
When using an Obsidian API newer than `minAppVersion` (currently 1.12.0), guard it with `requireApiVersion('x.y.z')` rather than duck-typing — that's what `eslint-plugin-obsidianmd`'s `no-unsupported-api` rule recognizes as safe. See `src/utils/buttonCompat.ts` and `SettingsTab.ts`'s `getSettingDefinitions()`/`display()` pair for the pattern.

### Deprecated API usage
Don't suppress `@typescript-eslint/no-deprecated` with a disable comment — the lint config forbids it. If you have a legitimate reason to call a deprecated API (e.g. a fallback path for an older Obsidian version), let the warning surface; it doesn't fail the build.

### Popout-window compatibility
Use `activeDocument`/`activeWindow` (Obsidian's globals) instead of the bare `document`/`window`, and `window.setTimeout`/`window.clearTimeout` explicitly rather than the bare globals, for correctness when Obsidian is used in a popout window.

## Code Style Preferences

- Modern, clean TypeScript (async/await, optional chaining)
- Keep components small and focused
- Use descriptive names (e.g., `ProjectManager.setActiveProject()` not `ProjectManager.switch()`)
- Comment only the "why" (non-obvious constraints, workarounds), not the "what"
- No new features/abstractions beyond what's asked
