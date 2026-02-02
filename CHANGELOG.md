# Changelog

All notable changes to Lighthouse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/benjamincassidy/lighthouse/compare/1.0.3...HEAD
[0.9.0]: https://github.com/benjamincassidy/lighthouse/releases/tag/0.9.0
[1.0.0]: https://github.com/benjamincassidy/lighthouse/compare/0.9.0...1.0.0
[1.0.2]: https://github.com/benjamincassidy/lighthouse/compare/1.0.0...1.0.2
[1.0.3]: https://github.com/benjamincassidy/lighthouse/compare/1.0.2...1.0.3
