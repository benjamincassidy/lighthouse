---
title: Project Dashboard
description: Your project's central hub with stats, heatmap, and streak tracking
---

# Project Dashboard

The Project Dashboard is your central hub for viewing project statistics, switching projects, and visualising your writing activity over time.

## Opening the Dashboard

- **Command Palette** — `Lighthouse: Open project dashboard`
- **Writing Workspace** — The dashboard opens automatically when you enter the writing workspace

## Dashboard Sections

### Active Project Selector
Switch between your projects using the dropdown at the top. The entire dashboard updates instantly.

### Goal Ring & Project Stats
If you've set a word count goal you'll see:
- **Goal ring** — Animated circular progress indicator showing percentage complete
- **Words written / goal total** — Exact numbers with "X to go" or "Goal reached!"
- **Files** — Number of markdown files in the project
- **Started** — The date the project was created

If no goal is set, the total word count is shown as a simple stat card.

### Writing Activity Heatmap
A 13-week (91-day) GitHub-style activity calendar showing daily writing output. Each cell is a circle that grows in size with intensity:

| Level | Words (no daily target set) | Appearance |
|-------|-----------------------------|------------|
| 0 | No writing | Small muted dot |
| 1 | 1–249 | Small accent circle |
| 2 | 250–499 | Medium circle |
| 3 | 500–999 | Large circle |
| 4 | 1,000+ | Full circle |

When you set a **daily goal** or have a **deadline**, the levels scale relative to your target instead of absolute word counts.

**Hover** any cell to see the date and exact word count in a tooltip.

Month labels appear along the top and day labels (M/W/F/S) along the left.

### Streak Stats
Below the heatmap legend:
- **Day streak** — Current consecutive-day writing chain (in amber)
- **Personal best** — Longest streak you've achieved (muted, shown alongside current)

Rest days you've marked in the Stats Panel count toward the streak.

### Project Management Actions
Header buttons for the active project:
- **Edit** — Opens the full project settings modal
- **Delete** — Removes the project configuration (your files are not deleted)
- **New project (+)** — Creates a new project
