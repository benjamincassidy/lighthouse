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
2. **Group level** — Total words in the current group (including nested groups)
3. **Project level** — Complete project word count (everything under the root, except Extras)

### Extras-Excluded Counting

Project totals include everything under the project root **except the Extras group**. This ensures your progress toward a goal reflects actual writing, not research notes. See [Groups & Extras](/core-concepts/groups/) for how Extras works.

### Excluding an Individual File

To exclude a single file from word-count totals without moving it into Extras, add this to its YAML frontmatter:

```yaml
---
lighthouse-uncounted: true
---
```

The file is skipped entirely from project and group totals — same treatment as an Extras file, just scoped to one note wherever it lives. Useful for a dedication, an epigraph, or any note you don't want counted toward a goal but don't want to relocate.

## What Gets Counted

### Included by default
- Regular prose text
- The display text of links and wiki-links (not the path/target)
- Headings, list items, and blockquotes (the markdown markers themselves are stripped, not the text)
- Table content

### Excluded by default
- **YAML frontmatter** — The `---` block at the top of a file (configurable)
- **Code blocks** — Fenced ` ``` ` blocks (configurable)
- Markdown syntax characters — heading markers, list markers, bold/italic/strikethrough markers, horizontal rules
- Em-dashes, en-dashes, and horizontal bars (treated as word separators, not part of a word)

You can toggle code block and frontmatter exclusion in **Settings → Lighthouse**.

### Counting Method

Lighthouse uses a simple, consistent algorithm:
1. Optionally strip YAML frontmatter
2. Optionally strip fenced code blocks
3. Strip markdown syntax (headings, lists, emphasis, horizontal rules) down to their plain text
4. Resolve `[[wikilinks]]` and `[markdown links](url)` to their display text
5. Treat dashes as word separators
6. Split on whitespace and count non-empty tokens

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

## Per-File and Per-Group Goals

Beyond the project-wide goal, you can set targets on individual files and groups:

- **Per-file goals** — Set on a file's context menu, or in the project editor. A progress bar appears in the Inspector's Stats tab when the file is active.
- **Per-group goals** — Set in the project editor under **Group goals**. A small progress ring appears next to the group in the Library. Hover for the exact word count vs target.

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

- Learn about the [Inspector](/features/inspector/)
- Explore the [Library](/features/library/)
- Read about [Tracking Progress](/guides/tracking-progress/)
