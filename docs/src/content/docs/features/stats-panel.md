---
title: Writing Stats Panel
description: Real-time writing progress tracking
---

# Writing Stats Panel

The Writing Stats Panel is a persistent sidebar that displays real-time word counts and writing progress.

## Opening the Panel

- **Ribbon Icon:** Click the Lighthouse icon in the left sidebar
- **Command Palette:** Run `Lighthouse: Toggle Stats Panel`

## What It Shows

### File Stats
- **Current File** - Word count of the active document

### Folder Stats
- **Current Folder** - Total words in the folder containing the active file

### Project Stats
- **Project Total** - Complete word count for all content folders

### Progress Tracking
- **Session** - Words written since opening Obsidian
- **Today** - Words written today (resets at midnight)

### Goal Progress
If you've set a word count goal, see:
- Progress bar showing percentage complete
- Numerical goal (e.g., "50,000 / 80,000")

## Features

### Real-Time Updates
The panel updates automatically as you write, with a 200ms debounce to avoid flickering.

### Persistent State
- Today's count persists across Obsidian sessions
- Resets automatically at midnight

### Smart Session Tracking
The session counter adjusts intelligently when you delete content, ensuring accurate tracking.

*More detailed documentation coming soon.*
