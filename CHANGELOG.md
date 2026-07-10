# Changelog

All notable changes to Lighthouse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `lighthouse-uncounted: true` YAML frontmatter flag to exclude an individual file from word-count totals, goals, and pacing — independent of Extras-folder membership

### Changed
- **PDF export no longer downloads a native Typst binary.** Typst now runs entirely in-process via WebAssembly, bundled with the plugin — no subprocess, no runtime download, no network call. The Export dialog no longer prompts to install a Typst binary before exporting to PDF.

## [1.3.0] - 2026-07-08

### Changed
- **Raised minimum Obsidian version to 1.12.0** (from 1.4.0) to support current Settings and popout-window APIs
- Adopted Obsidian's new declarative Settings API (`getSettingDefinitions`) on 1.13.0+, with the classic `display()` path kept as an automatic fallback on older 1.12.x installs
- Destructive actions (e.g. deleting a project) use Obsidian's native destructive button styling on 1.13.0+, falling back to the previous styling on older versions
- Internal code now consistently uses Obsidian's `activeDocument`/`activeWindow` instead of the browser's bare `document`/`window`, for correctness in popout windows
- Removed unused legacy CSS and data left over from an early export-style prototype that was never wired to actual PDF/DOCX output — built-in export styles have used downloaded Typst/Word templates for some time

### Fixed
- Cleaned up remaining CSS lint issues (`!important`, an expensive `:has()` selector) flagged by Obsidian's plugin review tooling
- Fixed `docs/README.md`, which still had the unedited Astro/Starlight starter template text
- Fixed a formatting bug in `scripts/README.md`'s version-numbering section
- Updated dependencies (esbuild, eslint-plugin-obsidianmd, and a transitive `brace-expansion` advisory) to resolve moderate security advisories

## [1.2.0] - 2026-07-07

### Added
- file splitting and merging (#52)

### Fixed
- treat em-dashes and en-dashes as word separators (#50)
- exclude markdown syntax from word counts (#49)
- address all Obsidian ESLint compliance issues (#48)

## [1.1.0] - 2026-04-12

### Added
- **Bibliography Support**: Projects can now specify a bibliography file (BibTeX, YAML, or JSON) for citations
- **CSL Citation Styles**: Comprehensive citation formatting system with 10 bundled popular styles (APA, Chicago, MLA, Harvard, IEEE, Vancouver, AMA, Nature, Elsevier Harvard, ACM)
- **Searchable Style Download**: Download any of 10,000+ citation styles from the official CSL GitHub repository with live search
- **Project-Level Citation Configuration**: Set citation style once per project, automatically applied to all exports
- **Table of Contents**: Optional TOC generation for PDF, DOCX, and EPUB exports
- **Chapter Page Breaks**: Optional page breaks before each content file in PDF and DOCX exports
- **File Picker Dialogs**: Native system file picker for selecting bibliography files and output folders
- **Export Settings Persistence**: Last export settings (format, style, output folder, etc.) are saved per-project and restored on next export

### Fixed
- **Citation Processing**: Citations now work correctly in PDF (via Typst), DOCX, and EPUB (via Pandoc --citeproc)
- **Bibliography Formatting**: Bibliographies include proper headers and page breaks in all formats
- **Export Modal Reactivity**: Fixed Svelte 5 reactivity warnings for plugin prop references

### Changed
- **TypstRunner**: Renamed from TypestRunner for correct spelling
- **Export Workflow**: Streamlined export settings with better defaults and persistence

## [1.0.6] - 2026-03-15

### Added
- custom drag-and-drop file sorting in Project Explorer

### Fixed
- correct drag-and-drop indicator and view reactivity

## [1.0.5] - 2026-03-15

### Added
- **New Note in Folder**: Each folder row in the explorer has a "+" button to create a new note directly inside that folder, with auto-incrementing name and immediate rename prompt
- **New Folder from Explorer**: Content and Source section headers each have a folder "+" button to create a new subfolder at the project root, automatically added to the correct section
- **Vault Event Listeners**: Explorer tree now refreshes automatically on any vault create, delete, or rename event — new files and folder renames reflect instantly

### Changed
- **Delete Button Styling**: Dashboard delete project button no longer renders as a solid red box; uses a subtle icon-only danger colour with a restrained hover state
- **File Names Without Extension**: Files in the project explorer no longer show the `.md` extension, matching Obsidian's native file explorer behaviour
- **Folder Collapse Chevron Direction**: Fixed inverted chevron — expanded folders now correctly point down, collapsed folders point right
- **Explorer Section Headers**: Removed folder counts from Content and Source section headers for a cleaner look
- **Removed Dashboard Button from Settings**: The "Open Dashboard" button in settings was redundant (accessible via ribbon and command palette) and has been removed

### Fixed
- **Context Menu on Folders**: Right-clicking files and folders in the explorer now correctly shows the Obsidian context menu (rename, delete, etc.). Root cause was a Svelte 5 prop naming conflict — `oncontextmenu` is treated as a native DOM event binding, silently swallowing events before they reached the handler

### Added
- **Project Switcher in Explorer**: Added dropdown in project explorer header to quickly switch projects without opening dashboard
- **Active File Highlighting**: Currently open file is now highlighted in project explorer
- **Collapsible Content/Source Sections**: Project explorer now groups folders by type with collapsible headers showing folder counts

### Changed
- **Native Theme Integration**: Project explorer, dashboard, and stats panel now use Obsidian's native CSS classes for perfect theme compatibility
  - Project explorer uses `nav-header`, `nav-folder-title`, `tree-item`, and native tree styling
  - Dashboard buttons use `mod-cta` and `mod-warning` classes
  - Empty states use `pane-empty` class
  - Dropdown selects use native `dropdown` class
- **Project Explorer Layout**: Split into distinct "Content" and "Source" sections with collapsible headers
- **Folder Icons**: Content folders use standard folder icon, source folders use folder-pen icon to distinguish reference material
- **Chevron Animation**: Fixed folder collapse/expand chevron to rotate smoothly like Obsidian's native file explorer
- **Indentation**: Matched project explorer indentation to Obsidian's native file explorer (24px per level)
- **Removed Quick Actions**: Removed redundant quick action buttons from dashboard for cleaner interface

### Fixed
- **Keyboard Accessibility**: Added keyboard support (Enter/Space) for collapsible section headers

## [1.0.4] - 2026-02-01

### Added
- **Switch Project Command**: New command palette action to quickly switch between projects with fuzzy search
- **Enhanced Zen Mode**: Now hides tabs (with hover to reveal), breadcrumbs, navigation arrows, and sidebar toggles for true distraction-free writing

### Changed
- **Project Explorer Icon**: Updated to lightbulb icon to match plugin branding (appears in both ribbon and view tab)

### Fixed
- **Critical: Projects disappearing on restart**: Fixed bug where projects and active project selection were lost when restarting Obsidian due to settings structure conflict
- **Session word count persisting**: Fixed bug where "This Session" counter showed incorrect values from previous sessions instead of resetting to 0 on Obsidian startup

## [1.0.3] - 2026-01-14

- fix project description

## [1.0.2] - 2026-01-14

### Fixed
- Remove default hotkeys from commands to avoid conflicts with user settings and Obsidian defaults
- Replace browser `alert()` and `confirm()` with Obsidian's `Notice` and `Modal` APIs for better UX
- Fix floating promises by adding `void` operator to async callbacks
- Remove ESLint disable directives and use proper TypeScript types for Svelte components
- Fix imports to use proper ES6 imports instead of `require()` statements

## [1.0.0] - 2026-01-14

- Create release scripting
- Create release github actions

## [0.9.0] - 2026-01-14

### Added

- **Project Management**
  - Create, edit, delete, and switch between independent writing projects
  - Each project has its own configuration and folder structure
  - Active project persists across Obsidian sessions
  - Project list with quick switching in dashboard

- **Smart Word Counting**
  - Real-time hierarchical word counts at file, folder, and project levels
  - Efficient caching system with automatic updates on file changes
  - Debounced counting to prevent performance issues
  - Support for nested folder structures

- **Content vs Source Folders**
  - Designate folders as "content" (counts toward word goals) or "source" (research/reference)
  - Mix and match folder types within a single project
  - Visual indicators in file explorer to distinguish folder types
  - Smart filtering of content for accurate goal tracking

- **Project Dashboard**
  - Comprehensive project statistics view
  - Total words, files, and folder counts
  - Quick access to project settings
  - Project switching interface
  - Delete project functionality with confirmation

- **Writing Stats Panel**
  - Persistent right-side panel showing real-time statistics
  - Current file word count
  - Current folder word count
  - Total project word count
  - Session tracking (words written today/this session)
  - Progress bars when goals are set
  - Clean, minimal design

- **Filtered File Explorer**
  - Project-scoped file tree view
  - Shows only files from active project's folders
  - Hierarchical display of content and source folders
  - File type icons and folder badges
  - Click to open files in editor

- **Zen Mode**
  - Distraction-free writing mode
  - Hides sidebars, status bar, and ribbon
  - Optional Stats Panel visibility for goal tracking
  - Toggle via command palette or ribbon icon
  - Smooth transitions

- **Commands**
  - Create project
  - Delete project
  - Switch project
  - Open dashboard
  - Open project explorer
  - Toggle Stats Panel
  - Toggle Zen Mode

- **Settings**
  - Configure default project settings
  - Customize Stats Panel behavior
  - Set word count update frequency
  - Configure Zen Mode behavior

### Technical

- Built with TypeScript and Svelte 5
- Comprehensive test suite (95% coverage)
- Modern build tooling with esbuild
- Reactive state management with Svelte stores
- Efficient file watching and caching
- Proper cleanup on plugin unload

### Documentation

- Complete Starlight documentation site
- GitHub Pages deployment at [benjamincassidy.github.io/lighthouse](https://benjamincassidy.github.io/lighthouse/)
- API documentation
- User guides and tutorials
- Troubleshooting section

### Development

- ESLint configuration with Obsidian plugin rules
- Prettier code formatting
- Vitest for unit testing
- Git hooks for quality checks
- Hot reload support for development

## Notes

This is the first alpha release of Lighthouse. The plugin is functional and ready for testing, but may contain bugs. Please report any issues on [GitHub](https://github.com/benjamincassidy/lighthouse/issues).

### Known Limitations

- No template system yet (planned for future release)
- No Dataview integration yet (planned for future release)
- Word count goals are per-project only (no folder-level goals yet)

### Migration Notes

As this is the first release, no migration is necessary. All project data is stored in plugin settings and uses standard Obsidian markdown files.

[Unreleased]: https://github.com/benjamincassidy/lighthouse/compare/1.3.0...HEAD
[0.9.0]: https://github.com/benjamincassidy/lighthouse/releases/tag/0.9.0
[1.0.0]: https://github.com/benjamincassidy/lighthouse/compare/0.9.0...1.0.0
[1.0.2]: https://github.com/benjamincassidy/lighthouse/compare/1.0.0...1.0.2
[1.0.3]: https://github.com/benjamincassidy/lighthouse/compare/1.0.2...1.0.3
[1.0.6]: https://github.com/benjamincassidy/lighthouse/compare/1.0.3...1.0.6
[1.2.0]: https://github.com/benjamincassidy/lighthouse/compare/1.0.6...1.2.0
[1.3.0]: https://github.com/benjamincassidy/lighthouse/compare/1.2.0...1.3.0
