---
title: Word Counting
description: How Lighthouse counts words accurately
---

# Word Counting

Lighthouse provides real-time, hierarchical word counting across your writing project.

## How It Works

### Real-Time Counting

Word counts update automatically as you type:
- **Immediate feedback** - See counts within 200ms of stopping typing
- **Live content** - Counts reflect your current editor content
- **No caching** - Always accurate, never stale

### Hierarchical Structure

Lighthouse tracks words at three levels:

1. **File Level** - Words in the current document
2. **Folder Level** - Total words in the current folder (including subfolders)
3. **Project Level** - Complete project word count (content folders only)

### Content-Only Counting

Project totals include **only content folders**, excluding source folders. This ensures accurate progress tracking toward your goals.

## What Gets Counted

### Included
- Regular text in markdown files
- Words in code blocks (inline and fenced)
- Text in links and bold/italic formatting
- Lists and blockquotes
- Table content

### Excluded
- YAML frontmatter
- HTML comments
- Markdown syntax characters (e.g., `#`, `*`, `-`)

### Counting Method

Lighthouse uses a simple, reliable counting algorithm:
1. Remove frontmatter and comments
2. Split on whitespace
3. Count non-empty tokens

This matches most word processor counting methods.

## Session and Daily Tracking

Beyond static word counts, Lighthouse tracks your writing progress:

### Session Count
Words written in the current Obsidian session (since you opened the vault).

- Starts at 0 when you open Obsidian
- Increases as you write
- Adjusts intelligently if you delete text

### Today Count
Words written today (resets at midnight).

- Persists across sessions
- Resets automatically at midnight
- Tracks daily productivity

## Stats Panel Display

The Writing Stats Panel shows:

```
📄 Current File: 1,234
📁 Current Folder: 12,345
📊 Project Total: 50,000

✍️ Session: +500
📅 Today: +2,000

🎯 Goal: 80,000 (63%)
```

All counts update in real-time as you write.

## Performance

Lighthouse is optimized for speed:

- **Debounced updates** - Waits 200ms after you stop typing
- **Efficient algorithm** - Counts millions of words per second
- **Smart caching** - Only recalculates when files change
- **Background processing** - Never blocks your typing

Even with large projects (100k+ words), counts update instantly.

## Accuracy

### Known Limitations

1. **Non-text files** - Only markdown files are counted
2. **Binary content** - Images, PDFs, etc. are ignored
3. **Code blocks** - Code is counted as words (this may change)

### Comparison with Other Tools

Word counts may differ slightly from:
- Microsoft Word (uses complex rules)
- Google Docs (similar to Lighthouse)
- wc command (counts differently)

Lighthouse's counts are consistent with most modern writing tools.

## FAQ

**Q: Why don't my counts match Microsoft Word?**
A: Word uses complex counting rules (e.g., treating hyphenated words differently). Lighthouse uses simpler, consistent rules.

**Q: Can I exclude code blocks from counts?**
A: Not currently, but this is planned for a future release with customizable counting rules.

**Q: Do word counts include deleted files?**
A: No. Lighthouse counts only existing files in your vault.

**Q: How often do counts update?**
A: File counts update 200ms after you stop typing. Project counts update immediately when you switch files.

## Next Steps

- Learn about the [Writing Stats Panel](/features/stats-panel/)
- Explore the [Project Dashboard](/features/dashboard/)
- Read about [Tracking Progress](/guides/tracking-progress/)
