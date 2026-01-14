# Lighthouse

> "It was done; it was finished. Yes, she thought, laying down her brush in extreme fatigue, I have had my vision."
> — Virginia Woolf, *To the Lighthouse*

**Project-based writing for Obsidian.**

Lighthouse brings professional writing project management to Obsidian, inspired by Ulysses but without sacrificing Obsidian's power and flexibility. Perfect for novelists, academic writers, and anyone working on long-form writing projects.

## Features

### ✅ Implemented

- **Multiple Projects:** Create and manage independent writing projects with their own configurations
- **Smart Word Counting:** Real-time hierarchical word counts at file, folder, and project levels
- **Content vs Source Folders:** Designate folders as "content" (counts toward goals) or "source" (research/reference material)
- **Project Dashboard:** View project statistics, manage projects, and track progress
- **Writing Stats Panel:** Persistent sidebar showing current file, folder, and project word counts with session and daily tracking
- **Project Management:** Create, edit, delete, and switch between projects seamlessly
- **Filtered File Explorer:** Project-scoped file tree view
- **Zen Mode:** Distraction-free writing mode

### 🚧 In Progress

- **Project Templates:** Templater integration with project-aware variables (planned)
- **Dataview Integration:** Enhanced dashboard queries (planned)

## Development Status

**Alpha:** Core features are functional! The plugin is ready for early testing. Documentation is in progress.

## Development

### Setup

```bash
npm install
```

### Build

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
```

### Test

```bash
# Run tests
npm test

# Run tests with UI
npm test:ui

# Generate coverage report
npm test:coverage
```

### Lint & Format

```bash
# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check
```

## Installation (Future)

Once released, Lighthouse will be available in Obsidian's community plugins.

### Manual Installation (For Testing)

1. Download the latest release from GitHub
2. Extract `main.js`, `manifest.json`, and `styles.css`
3. Copy them to your vault's `.obsidian/plugins/lighthouse/` folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

### Building from Source

```bash
git clone https://github.com/benjamincassidy/obsidian-lighthouse.git
cd obsidian-lighthouse
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

## Quick Start

1. **Create a Project:** Open the Command Palette (Cmd/Ctrl+P) and run "Lighthouse: Create Project"
2. **Configure Folders:** Designate which folders contain your writing (content) vs research (source)
3. **Start Writing:** Open the Stats Panel from the ribbon or command palette to track your progress
4. **View Dashboard:** Access the project dashboard to see detailed statistics and manage projects

## Documentation

Full documentation is available at [lighthouse-docs.example.com](#) (coming soon)

## Contributing

Contributions welcome! This is an early-stage project. See [LIGHTHOUSE_PROJECT_BRIEF.md](LIGHTHOUSE_PROJECT_BRIEF.md) for architecture and design decisions.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md/) community
