# Changelog

All notable changes to Lighthouse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- GitHub Pages deployment at [benjamincassidy.github.io/obsidian-lighthouse](https://benjamincassidy.github.io/obsidian-lighthouse/)
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

This is the first alpha release of Lighthouse. The plugin is functional and ready for testing, but may contain bugs. Please report any issues on [GitHub](https://github.com/benjamincassidy/obsidian-lighthouse/issues).

### Known Limitations

- No template system yet (planned for future release)
- No Dataview integration yet (planned for future release)
- Word count goals are per-project only (no folder-level goals yet)

### Migration Notes

As this is the first release, no migration is necessary. All project data is stored in plugin settings and uses standard Obsidian markdown files.

[Unreleased]: https://github.com/benjamincassidy/obsidian-lighthouse/compare/0.9.0...HEAD
[0.9.0]: https://github.com/benjamincassidy/obsidian-lighthouse/releases/tag/0.9.0
