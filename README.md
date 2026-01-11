# Lighthouse

> "It was done; it was finished. Yes, she thought, laying down her brush in extreme fatigue, I have had my vision."
> — Virginia Woolf, *To the Lighthouse*

**Project-based writing for Obsidian.**

Lighthouse brings professional writing project management to Obsidian, inspired by Ulysses but without sacrificing Obsidian's power and flexibility. Perfect for novelists, academic writers, and anyone working on long-form writing projects.

## Features (Planned)

- **Multiple Projects:** Manage independent writing projects, each with its own configuration
- **Smart Word Counting:** Hierarchical word counts at file, folder, and project levels
- **Content vs Source Folders:** Distinguish between content that counts toward your goals and research/reference material
- **Filtered File Explorer:** View only files belonging to your active project
- **Project Dashboard:** Customizable stats and insights with optional Dataview integration
- **Zen Mode:** Distraction-free writing with a single keystroke
- **Project Templates:** Templater integration with project-aware template variables

## Development Status

🚧 **Pre-alpha:** This plugin is in early development. Not yet functional.

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

Once released, Lighthouse will be available in Obsidian's community plugins. For now, you can:

1. Clone this repository
2. Run `npm install && npm run build`
3. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/lighthouse/` folder
4. Reload Obsidian and enable the plugin

## Contributing

Contributions welcome! This is an early-stage project. See [LIGHTHOUSE_PROJECT_BRIEF.md](LIGHTHOUSE_PROJECT_BRIEF.md) for architecture and design decisions.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md/) community
