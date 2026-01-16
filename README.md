# Lighthouse

<img align="right" src="docs/src/assets/lighthouse.jpeg" alt="Lighthouse" width="300"/>

> "It was done; it was finished. Yes, she thought, laying down her brush in extreme fatigue, I have had my vision."
> — Virginia Woolf, *To the Lighthouse*

<br />

### Project-based writing for Obsidian.

Lighthouse brings professional writing project management to Obsidian, inspired by Ulysses but without sacrificing Obsidian's power and flexibility. Perfect for novelists, academic writers, and anyone working on long-form writing projects.

<br clear="right"/>

---

## 📖 [Full Documentation](https://benjamincassidy.github.io/lighthouse/)

Visit the [complete documentation site](https://benjamincassidy.github.io/lighthouse/) for detailed guides, tutorials, and reference materials.

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

## Installation

### Community Plugins (Coming Soon)

Lighthouse will be available in Obsidian's Community Plugins once approved.

### Manual Installation (Current)

For testing the alpha release:

1. Download the [latest release](https://github.com/benjamincassidy/obsidian-lighthouse/releases) from GitHub
2. Extract the contents to your vault's `.obsidian/plugins/lighthouse/` folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Reload Obsidian
4. Enable "Lighthouse" in Settings → Community Plugins

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

## Contributing

Contributions welcome! This is an early-stage project. See [LIGHTHOUSE_PROJECT_BRIEF.md](LIGHTHOUSE_PROJECT_BRIEF.md) for architecture and design decisions.

## Support

If you find Lighthouse helpful, consider:
- ⭐ Starring the repository
- 💝 [Sponsoring on GitHub](https://github.com/sponsors/benjamincassidy)
- 🐛 Reporting bugs and suggesting features
- 📖 Improving documentation

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md/) community
