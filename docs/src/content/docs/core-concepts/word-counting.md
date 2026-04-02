---
title: Word Counting
description: How Lighthouse counts words accurately
---

# Word Counting

Lighthouse provides real-time, hierarchical word counting across your writing project.

## How It Works

### Real-Time Counting

Word counts update automatically as you type:
- **Immediate feedback** — Counts update within 200 ms of you stopping typing
- **Live content** — Counts reflect your current editor content, not the last saved version
- **Smart caching** — Only recalculates files that have changed

### Hierarchical Structure

Lighthouse tracks words at three levels:

1. **File level** — Words in the current document
2. **Folder level** — Total words in the current folder (including subfolders)
3. **Project level** — Complete project word count (content folders only)

### Content-Only Counting

Project totals include **only content folders**, not source folders. This ensures your progress toward a goal reflects actual writing, not research notes.

## What Gets Counted

### Included by default
- Regular prose text
- Words in links and wiki-links (link text, not the path)
- Bold, italic, and other inline formatting
- List items and blockquotes
- Table content
- Headings

### Excluded by default
- **YAML frontmatter** — The `---` block at the top of a file (configurable)
- **Code blocks** — Fenced ` ``` ` blocks (configurable)
- HTML comments
- Markdown syntax characters (`#`, `*`, `-`, etc.)

You can toggle code block and frontmatter exclusion in **Settings → Lighthouse**.

### Counting Method

Lighthouse uses a simple, consistent algorithm:
1. Optionally strip YAML frontmatter
2. Optionally strip fenced code blocks
3. Strip HTML comments
4. Split on whitespace
5. Count non-empty tokens

This gives counts consistent with most modern writing tools.

## Session and Daily Tracking

### Session Count
Words written since you opened Obsidian this session.
- Resets when you quit and reopen Obsidian
- Adjusts downward if you delete content (so you never go negative)
- Reflects net new words, not total keystrokes

### Today Count
Words written today (since midnight, local time).
- Persists across Obsidian restarts — closing and reopening doesn't reset it
- Resets automatically at midnight in **your local timezone**
- Stored per-project, so different projects have independent today counts

## Per-File and Per-Folder Goals

Beyond the project-wide goal, you can set targets on individual files and folders:

- **Per-file goals** — Set in the project editor under File Goals. A progress bar appears in the Stats Panel when the file is active.
- **Per-folder (chapter) goals** — Set in the project editor under Chapter Goals. A small amber progress ring appears next to the folder in the Project Explorer. Hover for the exact word count vs target.

## Performance

Lighthouse is optimised for large vaults:
- **Debounced updates** — Waits 200 ms after you stop typing before recounting
- **Incremental** — Only recalculates files that have changed since the last count
- **Non-blocking** — Counts run asynchronously and never interrupt typing

Even large projects (100 k+ words across hundreds of files) update in milliseconds.

## FAQ

**Q: Why don't my counts match Microsoft Word?**
Word uses complex rules (hyphenated words, contractions, etc.). Lighthouse uses simpler whitespace splitting, which matches Google Docs and most plain-text tools.

**Q: Can I exclude code blocks?**
Yes — go to Settings → Lighthouse and toggle **Exclude code blocks**.

**Q: Do word counts include deleted files?**
No. Lighthouse counts only existing files currently in your vault.

**Q: How often do counts update?**
File counts update 200 ms after you stop typing. Project-level counts update immediately when you switch files.

## Next Steps

- Learn about the [Writing Stats Panel](/features/stats-panel/)
- Explore the [Project Dashboard](/features/dashboard/)
- Read about [Tracking Progress](/guides/tracking-progress/)
