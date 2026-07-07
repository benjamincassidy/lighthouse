---
title: The Inspector
description: Project stats, writing activity, and outline in your right sidebar
---

# The Inspector

The Inspector is the right-sidebar counterpart to the [Library](/features/library/) — three tabs covering everything about your project's progress and the file you're currently writing.

## Opening the Inspector

The Inspector opens automatically as part of the [Writing Workspace](/features/project-management/#the-writing-workspace). To reopen just this panel if you've closed it without leaving the workspace, run **Lighthouse: Toggle inspector** from the Command Palette.

Three icon tabs sit at the top: **Overview**, **Stats**, and **Outline**. Lighthouse remembers which tab you last had open across sessions.

## Overview Tab

A goal ring, project stats, and your writing history at a glance.

### Goal Ring & Project Stats
If you've set a word count goal you'll see:
- **Goal ring** — animated circular progress indicator showing percentage complete
- **Words written / goal total** — exact numbers with "X to go" or "Goal reached!"
- **Files** — number of markdown files in the project
- **Started** — the date the project was created

If no goal is set, the total word count is shown as a simple stat card instead.

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

**Hover** any cell to see the date and exact word count in a tooltip. Month labels appear along the top and day labels (M/W/F/S) along the left.

### Streak Stats
Below the heatmap legend:
- **Day streak** — current consecutive-day writing chain (in amber)
- **Personal best** — longest streak you've achieved, shown alongside the current one

Rest days you've marked in the Stats tab count toward the streak.

## Stats Tab

Real-time word counts, goal progress, deadline pacing, and your writing streak — all in one glance.

### File & Group Stats
When you have an active markdown file open:
- **Current File** — word count of the active document, with an optional per-file goal progress bar
- **Current Folder** — total words in the group containing the active file

### Project Stats
- **Project Total** — complete word count for the project (Extras excluded)
- **Goal progress bar** — visual percentage bar (turns red if you exceed an *at-most* limit)

### Session & Daily Tracking
- **Today** — words written since midnight (persists across Obsidian restarts)
- **Session** — words written since you opened Obsidian

### Deadline Pacing
Shown when your project has both a word count goal and a deadline:
- **Words/day needed** — required daily output to hit your goal by the deadline; recalculates automatically as you write ahead or fall behind
- **Days left** — calendar days remaining until the deadline, inclusive of today
- **7-day average** — rolling average of your actual output over the past 7 writing days, colour-coded green (on pace) or orange (behind pace)

### Read & Speak Time
Shown when the project has words:
- Estimated **reading time** at 250 wpm
- Estimated **speaking time** at 130 wpm

### Writing Streak
Shown once you have writing history:
- **N-day streak** — consecutive days with any writing recorded
- **Personal best** — longest streak you've ever had (shown as a sublabel when it exceeds the current run)
- **Mark rest day / Unmark rest day** — appears when today has no writing yet. Marking a rest day keeps your streak alive without requiring words.

## Outline Tab

A simple heading outline of the active file — click any heading to jump the editor's cursor there. Shows "No headings in this file" for files without any, and stays empty when no markdown file is active.

## Features

### Real-Time Updates
The Stats tab updates automatically as you type, with a 200 ms debounce to avoid flickering during fast typing.

### Persistent Daily Count
Today's word count persists across Obsidian sessions and resets automatically at midnight, using local time (not UTC).

### Adaptive Pacing
The required daily target is not static. If you write 500 extra words today, tomorrow's target decreases proportionally. Miss a day and the remaining deficit is spread evenly across the days left before your deadline — no impossible catch-up numbers.

### Smart Session Tracking
If you delete a large block of text, the session baseline slides down so subsequent typing is still counted forward. The counter never goes below zero.

## Related

- [The Library](/features/library/)
- [Word Counting](/core-concepts/word-counting/)
- [Tracking Progress](/guides/tracking-progress/)
