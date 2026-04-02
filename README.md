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

**Project Management**
- **Multiple Projects** — Create and manage independent writing projects, each with its own configuration
- **Project Dashboard** — Central hub with goal ring, writing activity heatmap, and streak stats
- **Filtered File Explorer** — Project-scoped file tree; drag-and-drop to reorder files and folders
- **Project Switcher** — Fuzzy-search modal to jump between projects instantly
- **Writing Workspace** — One-command layout that opens all three Lighthouse panels

**Word Counting**
- **Smart hierarchical counts** — Real-time word counts at file, folder, and project levels
- **Content vs Source folders** — Count only what matters; designate research/reference folders as Source
- **Per-file and per-folder goals** — Set individual targets on files or chapters with inline progress rings
- **Word count goal directions** — *At least* (minimum target) or *at most* (word limit / trim mode)
- **Status bar count** — Live project total visible at the bottom of every window

**Progress & Pacing**
- **Deadline tracking** — Set a target finish date; see words/day needed and days remaining
- **Adaptive daily pace** — Required daily target recalculates automatically as you write over or under the target
- **Writing activity heatmap** — GitHub-style calendar showing 13 weeks of daily output with variable-size circles
- **Writing streak** — Current streak and personal best; rest days keep the chain alive
- **7-day rolling average** — On-pace / behind-pace indicator against your required daily target
- **Read/speak time** — Estimated reading time (250 wpm) and speaking time (130 wpm) for the project total

**Writing Stats Panel**
- Session words, today words, project total, file count, folder count
- Goal progress bar with percentage
- All deadline pacing stats
- Streak counter with "Mark rest day" toggle

**Flow Mode (Zen Mode)**
- Hides sidebars, ribbon, status bar, tabs, breadcrumbs, and navigation
- Optional typewriter scroll, custom font, line height, and line width settings

### 🚧 Planned

- **Project Compilation & Export** — Concatenate content files in order, strip frontmatter/wikilinks, save as a single document
- **File Splitting & Merging** — Split a note at cursor; merge two files into one
- **Manuscript Mode** — Continuous read-only multi-file view for reading your whole draft as one document
- **Outline View** — Project-wide heading tree for navigation
- **Inspector Panel** — Per-file synopsis, scratchpad, and source links
- **Dataview Integration** — Enhanced dashboard queries
- **Templater Integration** — Project-aware template variables

## Development Status

**Early Beta:** All core features are functional and tested. The plugin is ready for daily use. The Community Plugin submission is in progress.

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

# Generate coverage report
npm run test:coverage
```

### Lint & Format

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Installation

### Community Plugins (Coming Soon)

Lighthouse will be available in Obsidian's Community Plugins once the submission review is complete.

### Manual Installation (Current)

1. Download the [latest release](https://github.com/benjamincassidy/lighthouse/releases) from GitHub
2. Copy the three files to your vault's `.obsidian/plugins/lighthouse/` folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Reload Obsidian
4. Enable "Lighthouse" under Settings → Community Plugins

### Building from Source

```bash
git clone https://github.com/benjamincassidy/lighthouse.git
cd obsidian-lighthouse
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

## Quick Start

1. **Create a project** — Command Palette → `Lighthouse: Create new project`
2. **Configure folders** — Designate which folders are *content* (writing) vs *source* (research)
3. **Open the Stats Panel** — Click the Lighthouse icon in the ribbon
4. **Set a goal (optional)** — Edit the project and add a word count goal and deadline
5. **Start writing** — Lighthouse tracks everything automatically

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
