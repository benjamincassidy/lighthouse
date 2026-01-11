# Lighthouse Plugin - Copilot Instructions

## Project Overview
Lighthouse is an Obsidian plugin for project-based, long-form writing. Inspired by Ulysses, it provides writing project management without sacrificing Obsidian's flexibility. The project is currently in **pre-implementation** phase with comprehensive planning complete.

## Architecture & Tech Stack

**Core Technologies:**
- TypeScript (strict mode)
- Svelte for UI components
- esbuild for builds (with Svelte plugin)
- Obsidian Plugin API (latest stable)
- Svelte stores for state management

**Planned Module Structure:**
- `src/core/` - Core business logic (ProjectManager, WordCounter, FolderManager, stores)
- `src/ui/` - Svelte views and components
- `src/integrations/` - External plugin integrations (Dataview, Templater)
- `src/utils/` - Pure utility functions
- `src/types/` - TypeScript interfaces and types

## Key Architectural Decisions

### Data Ownership
- User data stays in standard markdown files
- No vendor lock-in - projects are just folders
- Project metadata stored in plugin settings (not in vault files)
- Vault-relative paths for portability

### Performance Strategy
- **Word counting:** Cached calculations with debounced updates
- Real-time updates but throttled to avoid blocking
- Hierarchical calculation: file → folder → project levels

### State Management
- Svelte stores for reactive state (see planned `src/core/stores.ts`)
- Active project context persists across sessions
- Store active project ID in plugin data

## Core Data Model

```typescript
interface Project {
  id: string;                    // UUID
  name: string;
  rootPath: string;              // Vault-relative
  contentFolders: string[];      // Paths relative to rootPath
  sourceFolders: string[];       // Paths relative to rootPath
  wordCountGoal?: number;
  dashboardConfig?: DashboardConfig;
  templateFolder?: string;
  metadata?: Record<string, any>;
}
```

**Critical distinction:** Content folders count toward word goals; source folders don't (research, notes, references).

## Development Workflow

**Not yet implemented - when building:**

1. **Build:** `npm run dev` (hot reload with obsidian-hot-reload plugin)
2. **Testing:** `npm test` (Vitest for unit tests) + manual testing in Obsidian dev vault
3. **Building for release:** `npm run build`

**Build Configuration:**
- esbuild with Svelte plugin for fast compilation
- Source maps enabled in dev mode
- CSS bundling: Svelte scoped styles + global `styles.css`
- Minification in production builds only

**Testing Strategy:**
- **Vitest** for unit tests (core logic, utilities, word counting)
- Test files: `*.test.ts` or `*.spec.ts` alongside source files
- Mock Obsidian API in tests using `vi.mock()`
- Focus testing on: ProjectManager CRUD, WordCounter logic, FolderManager operations
- Manual testing in Obsidian for UI components and integration

**Plugin Development:**
- Start minimal: scaffold → basic loading → add features incrementally
- Test each feature in Obsidian before moving to next
- Use Obsidian's developer console for debugging

**Import Paths:**
- Use relative path aliases via `tsconfig.json`:
  - `@/core/*` → `src/core/*`
  - `@/ui/*` → `src/ui/*`
  - `@/utils/*` → `src/utils/*`
  - `@/types/*` → `src/types/*`
- Example: `import { ProjectManager } from '@/core/ProjectManager'`

## Project-Specific Patterns

### Folder Type System
Projects distinguish between content (counts) and source (doesn't count) folders. This is core to the plugin's value proposition. Always respect this distinction in word counting logic.

### Plugin Integration Strategy
- **Dataview:** Optional integration for dashboard queries
- **Templater:** Optional integration for project templates with variables like `{{project_name}}`, `{{project_path}}`
- Check if plugins are installed before using their APIs

### Zen Mode Implementation
Must hide: sidebars, status bar, ribbon, plugin UI. Should coexist with other focus/zen plugins. Use Obsidian's `Workspace` API to manipulate UI elements.

## Key Features (Priority Order)

1. **Foundation:** Project CRUD, storage, switching
2. **Word Counting:** Accurate counts at file/folder/project levels
3. **Filtered Explorer:** Project-scoped file tree view
4. **Dashboard:** Stats and customizable dataview queries
5. **Zen Mode:** Distraction-free writing toggle
6. **Templates:** Project-aware template system

## Code Style Preferences

- Modern, clean TypeScript (use async/await, optional chaining)
- Prefer composition over inheritance
- Keep components small and focused
- Use descriptive names (e.g., `ProjectManager.switchActiveProject()` not `ProjectManager.switch()`)
- Document complex logic with comments explaining "why" not "what"

## Important Constraints

- User is experienced with TypeScript and Obsidian plugins
- User prefers minimal, modern design (think Ulysses aesthetic)
- Primary use case: literary/creative writing projects, academic theses and dissertations, blog posts, technical writing, journal articles
- Must integrate smoothly with Obsidian ecosystem
- Must be fast and performant even with large vaults
- No data loss - autosave, proper error handling
- Starting fresh - prioritize modern, clean patterns over legacy approaches

## When Building New Features

1. Check if feature exists in project brief (`LIGHTHOUSE_PROJECT_BRIEF.md`)
2. Follow planned file structure in brief
3. Use data models defined in brief as starting point
4. Ask for clarification on ambiguous design decisions before implementing
5. Prioritize working code over completeness
6. Keep extensibility in mind - architecture should accommodate future features

## Files to Reference
- [LIGHTHOUSE_PROJECT_BRIEF.md](../LIGHTHOUSE_PROJECT_BRIEF.md) - Comprehensive requirements and architecture
