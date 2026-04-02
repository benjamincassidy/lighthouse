---
title: Writing Stats Panel
description: Real-time writing progress and pacing in your sidebar
---

# Writing Stats Panel

The Writing Stats Panel is a persistent sidebar that shows real-time word counts, goal progress, deadline pacing, and your writing streak — all in one glance.

## Opening the Panel

- **Ribbon icon** — Click the Lighthouse icon in the left sidebar
- **Command Palette** — `Lighthouse: Open writing stats`

## What It Shows

### File & Folder Stats
When you have an active markdown file open:
- **Current File** — Word count of the active document, with an optional per-file goal progress bar
- **Current Folder** — Total words in the folder containing the active file

### Project Stats
- **Project Total** — Complete word count for all content folders
- **Goal progress bar** — Visual percentage bar (turns red if you exceed an *at-most* limit)

### Session & Daily Tracking
- **Today** — Words written since midnight (persists across Obsidian restarts)
- **Session** — Words written since you opened Obsidian

### Deadline Pacing
Shown when your project has both a word count goal and a deadline:
- **Words/day needed** — Required daily output to hit your goal by the deadline; recalculates automatically as you write ahead or fall behind
- **Days left** — Calendar days remaining until the deadline, inclusive of today
- **7-day average** — Rolling average of your actual output over the past 7 writing days, colour-coded green (on pace) or orange (behind pace)

### Read & Speak Time
Shown when the project has words:
- Estimated **reading time** at 250 wpm
- Estimated **speaking time** at 130 wpm

### Writing Streak
Shown once you have writing history:
- **N-day streak** — Consecutive days with any writing recorded
- **Personal best** — Longest streak you've ever had (shown as a sublabel when it exceeds the current run)
- **Mark rest day / Unmark rest day** — Appears when today has no writing yet. Marking a rest day keeps your streak alive without requiring words.

## Features

### Real-Time Updates
The panel updates automatically as you type, with a 200 ms debounce to avoid flickering during fast typing.

### Persistent Daily Count
Today's word count persists across Obsidian sessions and resets automatically at midnight, using local time (not UTC).

### Adaptive Pacing
The required daily target is not static. If you write 500 extra words today, tomorrow's target decreases proportionally. Miss a day and the remaining deficit is spread evenly across the days left before your deadline — no impossible catch-up numbers.

### Smart Session Tracking
If you delete a large block of text, the session baseline slides down so subsequent typing is still counted forward. The counter never goes below zero.
