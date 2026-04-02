---
title: Settings
description: Complete reference for all Lighthouse settings
---

# Settings Reference

Access Lighthouse settings from **Settings → Lighthouse**.

## Global Settings

### Word Count

| Setting | Default | Description |
|---|---|---|
| Show word count in status bar | On | Displays the active project's word count in the Obsidian status bar. |
| Exclude code blocks | On | Fenced ` ``` ` blocks are stripped before counting. |
| Exclude frontmatter | On | YAML frontmatter (`---` blocks) is stripped before counting. |

### Flow Mode

Flow Mode is toggled with the **Lighthouse: Toggle flow mode** command (or the toolbar button). The following settings control what it does:

| Setting | Default | Description |
|---|---|---|
| Hide status bar | On | Hides the Obsidian status bar when Flow Mode is active. |
| Hide ribbon | On | Hides the left ribbon (icon bar) when Flow Mode is active. |
| Typewriter scrolling | On | Keeps the active line vertically centred as you type. |
| Custom font | *(none)* | Font family name to use in Flow Mode (e.g. `"iA Writer Quattro V"`). Leave blank to use the vault default. |
| Line height | *(0 = default)* | Custom line height multiplier in Flow Mode. Set to `0` to leave unchanged. |
| Line width | *(0 = default)* | Custom reading line width (in characters) in Flow Mode. Set to `0` to leave unchanged. |

### Developer

| Setting | Default | Description |
|---|---|---|
| Debug mode | Off | Logs verbose output to the developer console. Useful when reporting bugs. |

---

## Per-Project Settings

Per-project settings are edited through the project editor (Command Palette → *Lighthouse: Create new project*, or the pencil icon on the Dashboard).

### Core

| Setting | Description |
|---|---|
| Name | Human-readable project identifier. |
| Root path | Vault-relative path to the project's root folder. |
| Content folders | Subfolders (relative to root) whose words count toward the word count goal. |
| Source folders | Subfolders (relative to root) that are part of the project but excluded from the word count (research, notes, references). |

### Goals

| Setting | Description |
|---|---|
| Word count goal | Total target word count for the project. |
| Goal direction | **At least** (default) — progress bar fills as you approach the goal. **At most** — bar turns red when you exceed it (useful for word-limit projects like academic papers). |
| Chapter goals | Per-folder word count targets. Shown as amber progress rings in the Project Explorer. |
| File goals | Per-file word count targets. Shown as a progress bar in the Stats Panel when that file is active. |

### Deadline & Pacing

| Setting | Description |
|---|---|
| Target finish date | The deadline (`YYYY-MM-DD`). Used to calculate the required daily word count. |
| Daily word goal | Explicit daily target used to colour heatmap cells. If blank, Lighthouse derives it from the total goal and deadline. |

### Streak & Rest Days

Rest days are managed from the **Stats Panel** by tapping *Mark rest day*. They are stored internally as a list of `YYYY-MM-DD` dates on the project. Rest days count toward the writing streak without requiring any words.
