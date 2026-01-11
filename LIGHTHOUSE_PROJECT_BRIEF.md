# Lighthouse - Project Brief for Development

## Project Overview

**Lighthouse** is a new Obsidian plugin for project-based, long-form writing. Inspired by Ulysses and modernist literature (particularly Virginia Woolf's "To the Lighthouse"), it brings professional writing project management to Obsidian without sacrificing any of Obsidian's power and flexibility.

### Project Name & Branding
- **Name:** Lighthouse
- **Tagline:** "Project-based writing for Obsidian"

---

## Core Requirements

### 1. Multiple Independent Projects
- Each project is self-contained with its own configuration
- Projects can be created, archived, deleted, and switched between
- Active project context persists across Obsidian sessions
- Project metadata stored in plugin settings (or optionally in project folders)

### 2. Source vs Content Folders
- Each project has designated folder types:
  - **Content folders:** Count towards word count (e.g., chapters, scenes, drafts)
  - **Source folders:** Reference material, research, notes (don't count toward goals)
- User can designate folder types per project
- Flexible folder structure - no rigid requirements

### 3. Hierarchical Word Counts
- Track word counts at multiple levels:
  - **File level:** Individual document word count
  - **Folder level:** Aggregate count of all content files in folder
  - **Project level:** Total content word count for entire project
- Real-time updates as user writes
- Display counts in appropriate UI contexts

### 4. Project-Filtered File Explorer
- Custom file tree view showing ONLY files from active project
- Similar to MAKE.md's project filtering
- Can toggle between filtered view and full vault view
- Should integrate cleanly with Obsidian's UI

### 5. Zen Mode
- Distraction-free writing mode
- Easily toggleable (keyboard shortcut)
- Hides:
  - Sidebars
  - Status bar
  - Ribbon
  - Plugin UI elements (optionally)
- Project-aware (can show minimal project info if desired)
- Should work harmoniously with existing zen/focus plugins

### 6. Project Dashboard
- Customizable dashboard for each project
- Integrates with Dataview plugin (if installed)
- Shows:
  - Project statistics (word count, file count, progress)
  - Custom dataview queries for project data
  - Quick actions (new file from template, switch folders, etc.)
- Each project can have unique dashboard configuration

### 7. Project-Specific Templates
- Integration with Templater plugin (if installed)
- Templates scoped to individual projects
- Template variables available:
  - `{{project_name}}`
  - `{{project_path}}`
  - `{{content_folders}}`
  - `{{source_folders}}`
  - Custom project metadata
- Templates stored per-project or globally

### 8. Writing Stats Panel
- Persistent right-side panel (similar to Ulysses)
- Toggleable visibility
- Shows real-time writing statistics:
  - Current file word count
  - Current folder word count
  - Total project word count
  - Progress bar towards project goal (if set)
  - Session writing stats (words written today/this session)
  - Writing streak information
- Minimal, distraction-free design
- Can be shown/hidden independently of other UI elements
- Optionally visible in Zen Mode for goal tracking

---

## Technical Requirements

### Technology Stack
- **Language:** TypeScript
- **Framework:** Svelte for UI components
- **Build Tool:** esbuild (fast, modern)
- **Obsidian API:** Use latest stable API version
- **State Management:** Svelte stores

### Architecture Principles
- **Modular:** Clear separation between features (projects, word counting, UI, etc.)
- **Extensible:** Easy to add new features without breaking existing ones
- **Performance:** Efficient word counting, debounced updates, cached calculations
- **Data Safety:** Regular autosave, no data loss on crashes
- **User Control:** Users own their data, stored in standard markdown

### File Structure (Suggested)
```
lighthouse/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── core/
│   │   ├── ProjectManager.ts   # Project CRUD and switching
│   │   ├── WordCounter.ts      # Word counting logic
│   │   ├── FolderManager.ts    # Content vs source folder management
│   │   └── stores.ts           # Svelte stores for state
│   ├── ui/
│   │   ├── views/
│   │   │   ├── DashboardView.svelte      # Project dashboard
│   │   │   ├── ProjectExplorer.svelte    # Filtered file tree
│   │   │   ├── StatsPanel.svelte         # Writing stats panel
│   │   │   └── SettingsTab.svelte        # Plugin settings
│   │   ├── components/
│   │   │   ├── ProjectSwitcher.svelte
│   │   │   ├── WordCountDisplay.svelte
│   │   │   ├── ProgressBar.svelte
│   │   │   └── ZenModeToggle.svelte
│   │   └── styles/
│   ├── integrations/
│   │   ├── dataview.ts         # Dataview integration
│   │   └── templater.ts        # Templater integration
│   ├── utils/
│   │   ├── wordCounting.ts
│   │   ├── fileUtils.ts
│   │   └── helpers.ts
│   └── types/
│       └── types.ts            # TypeScript interfaces
├── styles.css
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.js
└── README.md
```

### Data Models (Initial)

```typescript
interface Project {
  id: string;
  name: string;
  rootPath: string;              // Vault-relative path
  contentFolders: string[];      // Paths relative to rootPath
  sourceFolders: string[];       // Paths relative to rootPath
  wordCountGoal?: number;
  createdAt: string;
  updatedAt: string;
  dashboardConfig?: DashboardConfig;
  templateFolder?: string;
  metadata?: Record<string, any>;
}

interface DashboardConfig {
  dataviewQueries?: string[];
  showWordCount: boolean;
  showFileCount: boolean;
  customWidgets?: Widget[];
}

interface ProjectStats {
  totalWords: number;
  totalFiles: number;
  folderStats: Map<string, FolderStats>;
}

interface FolderStats {
  path: string;
  wordCount: number;
  fileCount: number;
  children: FolderStats[];
}
```

---

## Development Phases (Suggested)

### Phase 1: Foundation
- [ ] Scaffold plugin structure
- [ ] Set up build system (TypeScript, React, esbuild)
- [ ] Basic plugin lifecycle (load, unload, settings)
- [ ] Project data model and storage
- [ ] Simple project creation and switching

### Phase 2: Core Features
- [ ] Word counting engine (with proper language support)
- [ ] Content vs source folder designation
- [ ] Hierarchical word count calculation
- [ ] Basic UI for project management

### PhWriting stats panel (right sidebar)
- [ ] ase 3: Advanced UI
- [ ] Project-filtered file explorer view
- [ ] Project dashboard with statistics
- [ ] Zen mode implementation
- [ ] Settings interface

### Phase 4: Integrations
- [ ] Dataview integration for dashboards
- [ ] Templater integration for project templates
- [ ] Template variable system

### Phase 5: Polish & Release
- [ ] Testing and bug fixes
- [ ] Documentation (README, usage guide)
- [ ] Performance optimization
- [ ] Community plugin submission

---

## Instructions for AI Assistant

**Context:** You are helping build a brand new Obsidian plugin called "Lighthouse" for project-based writing.

**Starting Point:**
1. User will provide an empty directory path
2. Scaffold a complete Obsidian plugin structure with TypeScript + Svelte
3. Use modern best practices (esbuild, proper typing, modular architecture)
4. Include all configuration files (tsconfig, package.json, manifest.json, svelte.config.js, etc.)

**Approach:**
- Start with a minimal working plugin that loads successfully
- Build incrementally, testing each feature as we go
- Prioritize working code over completeness
- Keep architecture clean and extensible
- Ask clarifying questions when design decisions are ambiguous

**Reference Implementation:**
- The user has an existing plugin "keep-the-rhythm" that uses similar tech stack
- We can reference patterns from there but start fresh (don't copy wholesale)
- Focus on modern, clean code

**Key Principles:**
- User owns their data (standard markdown files)
- No vendor lock-in (projects are just folders)
- Works with existing Obsidian features
- Extensible for future features
- Fast and performant

---

## First Steps

When starting the new chat:

1. **Create the plugin scaffold:**
   - Use `create_new_workspace` tool to set up the project
   - Generate a TypeScript Obsidian plugin with Svelte support
   - Include build configuration for esbuild with Svelte plugin
   - Set up proper file structure

2. **Implement basic plugin:**
   - Get it loading in Obsidian
   - Add a simple command to verify it works
   - Create basic settings tab

3. **Build project management core:**
   - Data structures for projects
   - Storage/persistence
   - Basic CRUD operations

4. **Then iterate on features** based on priority and user feedback

---

## Questions to Consider

As you build, you may need to decide:

- Where to store project configs? (Plugin data vs. project folders?)
- How to handle project folder selection? (Manual vs. auto-detect?)
- Should projects be exclusive or can files belong to multiple projects?
- How to handle project deletion? (Keep files, archive, etc.)
- Word counting strategy: Real-time vs. cached vs. on-demand?
- Styling approach? (Scoped Svelte styles vs. global CSS?)

Make reasonable defaults but stay flexible for user preferences.

---

## Success Criteria

The plugin is successful when:
- ✅ User can manage multiple writing projects independently
- ✅ Writing stats panel shows progress towards goals
- ✅ Word counts are accurate and update in real-time
- ✅ File explorer can be filtered to active project
- ✅ Zen mode provides distraction-free writing
- ✅ Dashboard shows useful project insights
- ✅ Templates work with project context
- ✅ No data loss, fast performance, clean UX

---

## Additional Notes

- User is experienced with Obsidian plugins and TypeScript
- They have access to hot-reload plugin for fast development
- They prefer minimal, modern design
- Literary/creative writing is the primary use case
- Should feel like Ulysses but with Obsidian's flexibility

---

**Ready to build Lighthouse!** 🏮
