---
title: Settings
description: Complete reference for all Lighthouse settings
---

# Settings Reference

Access Lighthouse settings from **Settings → Lighthouse**.

## Projects

| Setting | Description |
|---|---|
| Active project | The project shown throughout the plugin. Select one here to edit or delete it below. |
| New project | Opens the project creation modal. |

## Flow Mode

Flow Mode is toggled with the **Lighthouse: Toggle flow mode** command (or the ribbon-adjacent hotkey you assign). The following settings control what it does:

| Setting | Default | Description |
|---|---|---|
| Hide status bar | On | Hides the Obsidian status bar when Flow Mode is active. |
| Hide ribbon | On | Hides the left ribbon (icon bar) when Flow Mode is active. |
| Typewriter scroll | On | Keeps the active line vertically centred as you type. |

### Typography

| Setting | Default | Description |
|---|---|---|
| Font family | *(none)* | Font to use in Flow Mode (e.g. `Georgia, serif`). Leave blank to inherit. |
| Line height | *(0 = inherit)* | Custom line-height multiplier in Flow Mode. Set to `0` to inherit. |
| Max line width | *(0 = inherit)* | Constrains the editor width, in pixels, for comfortable reading. Set to `0` to inherit. |
| Hotkey | — | Opens Obsidian's Hotkeys settings, filtered to Flow Mode, so you can assign a keyboard shortcut. |

## Word Counting

| Setting | Default | Description |
|---|---|---|
| Show word count in status bar | On | Displays the active file's word count in the Obsidian status bar. |
| Exclude code blocks | On | Fenced ` ``` ` blocks are stripped before counting. |
| Exclude frontmatter | On | YAML frontmatter (`---` blocks) is stripped before counting. |

## Debug Mode

| Setting | Default | Description |
|---|---|---|
| Debug mode | Off | Writes verbose logs to the developer console. Useful when reporting bugs. |

## About

Shows the installed version, a link to this documentation site, and a link to report an issue on GitHub.

---

## Per-Project Settings

Per-project settings are edited through the project editor — open the project's "⋯" menu in the Library header and choose **Edit project…**, or use **Lighthouse: Create new project** / the Settings tab's **Edit** button.

### Details

| Setting | Description |
|---|---|
| Project name | Human-readable project identifier. |
| Root folder | Vault-relative path to the project's root folder. Everything under it belongs to the project, except the Extras group — see [Groups & Extras](/core-concepts/groups/). |

### Citations

| Setting | Description |
|---|---|
| Bibliography file | Optional citation database (`.bib`, `.yaml`, `.json`) used when exporting with citations. |
| Citation style | CSL citation style used when formatting citations and the bibliography. Choose a bundled style, download more, or supply a custom `.csl` file. |

### Goals

| Setting | Description |
|---|---|
| Word count goal | Total target word count for the project. |
| Goal direction | **At least** (default) — progress bar fills as you approach the goal. **At most** — bar turns red when you exceed it (useful for word-limit projects like academic papers). |
| Deadline | Target finish date (`YYYY-MM-DD`). Used to calculate the required daily word count. |
| Daily writing goal | Explicit daily target used to colour heatmap cells. If blank, Lighthouse derives it from the total goal and deadline. |
| Group goals | Per-group (top-level folder) word count targets. Shown as progress rings in the Library. |

### File Goals

Not set in the project editor — right-click any file in the Library's Sheet List and choose **Set file word count goal**. Shown as a progress bar in the Inspector's Stats tab when that file is active.

### Streak & Rest Days

Rest days are managed from the Inspector's **Stats** tab by tapping *Mark rest day*. They are stored internally as a list of `YYYY-MM-DD` dates on the project. Rest days count toward the writing streak without requiring any words.
