---
title: Tracking Progress
description: Using Lighthouse to monitor and pace your writing
---

# Tracking Progress

Lighthouse gives you several interlocking tools to monitor output and stay on pace toward a deadline. This guide explains how to use them together.

## Setting a Goal & Deadline

Open the project editor (Command Palette → *Lighthouse: Switch project* → Edit, or the pencil icon on the Dashboard) and fill in:

- **Word count goal** — Your total target (e.g. 80,000 for a novel)
- **Goal direction** — *At least* means the bar fills as you approach the goal; *At most* turns the bar red if you exceed it (useful for academic word limits)
- **Target finish date** — The deadline. Lighthouse uses this with your remaining word count to calculate how many words you need per day.
- **Daily word goal** — Optional. Sets an explicit daily target used to colour the heatmap cells. If left blank, Lighthouse calculates it automatically from the deadline.

## The Stats Panel Pacing Section

Once you have a goal and deadline set, the Stats Panel shows:

```
Deadline
  1 287
  words/day needed · 43 days left

7-day avg
  1 450
  on pace
```

The **required daily** count recalculates every time the panel updates — so if you write 2,000 words today when only 1,000 were needed, tomorrow's target drops automatically. It's not a fixed schedule; it smooths the remaining work across the remaining days.

The **7-day average** shows your actual output over the past seven writing days (days with zero words are excluded). The colour tells you at a glance: green = on pace, orange = behind.

## The Writing Heatmap

The Dashboard's 13-week heatmap shows your daily writing history as a grid of circles. Circle size corresponds to output intensity:

- **No circle (dot)** — No writing that day
- **Small circle** — A little writing (< 40% of daily target)
- **Medium** — Good progress (40–74%)
- **Large** — Strong day (75–99%)
- **Full size** — Hit or exceeded the daily target

When you hover a cell, a tooltip shows the exact date and word count.

## Writing Streaks

Lighthouse tracks consecutive writing days automatically. The current streak and personal best appear both in the Stats Panel and below the heatmap on the Dashboard.

### Rest Days

If you plan to take a day off, tap **Mark rest day** in the Stats Panel (visible when today has no writing yet). This registers the day as a deliberate rest, keeping your streak intact without requiring words. You can unmark it anytime.

Rest days are stored per-project — marking a rest day on one project doesn't affect others.

## Chapter Goals

For chapter-by-chapter pacing, set per-folder goals in the project editor under **Chapter Goals**. Each folder then shows a small amber progress ring in the Project Explorer, so you can see at a glance which chapters are on track and which need more words.

## Tips

### Start with a realistic daily target
Divide your total remaining words by the days you actually plan to write (not calendar days). Lighthouse handles the math once you set the deadline, but it helps to sanity-check it: is the required daily count achievable given your schedule?

### Use the 7-day average as your real signal
The required daily target is the minimum. The 7-day average shows what you're *actually* achieving. If they're close, you're in good shape. If there's a large gap, it's time to either adjust the deadline or increase output.

### Review the heatmap once a week
The 13-week heatmap makes patterns visible — heavy days on weekends, dry spells mid-week. Use it to identify your natural writing rhythms and schedule accordingly.

### Don't break the chain
Writing streaks are a proven motivational tool. Even 100 words on a busy day keeps the streak alive and the habit intact.
