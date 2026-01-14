---
title: Content vs Source Folders
description: The distinction that makes Lighthouse powerful
---

# Content vs Source Folders

One of Lighthouse's most powerful features is the distinction between **content folders** and **source folders**. This concept, borrowed from Ulysses, is key to accurate writing progress tracking.

## The Core Concept

When working on a long-form writing project, not all folders should count toward your word count goal:

- **Content Folders** 📝 - Your actual writing that counts toward goals
- **Source Folders** 📚 - Research, notes, and reference material that doesn't count

## Why This Matters

### Without Content/Source Distinction

Imagine a novel project without folder types:

```
My Novel/
├── chapters/           (50,000 words - your manuscript)
├── research/          (30,000 words - character notes)
└── references/        (20,000 words - historical facts)

Total: 100,000 words
```

If your goal is 80,000 words for the novel, this shows 125% complete—but you've only written 50,000 words of actual content!

### With Content/Source Distinction

Mark folders appropriately:

```
My Novel/
├── chapters/          ✅ Content (50,000 words)
├── research/          📚 Source (30,000 words - excluded)
└── references/        📚 Source (20,000 words - excluded)

Content Total: 50,000 words (63% of goal)
```

Now your progress accurately reflects your actual writing!

## Content Folders

**Content folders** contain the writing that counts toward your project goals.

### Typical Content Folders

- `chapters/` - Novel chapters
- `drafts/` - Work in progress
- `scenes/` - Individual scenes
- `sections/` - Document sections
- `posts/` - Blog posts or articles
- `manuscript/` - Final draft

### When to Use Content

Mark a folder as content if:
- It contains text you're actively writing
- It will be part of the final deliverable
- You want it to count toward your word count goal
- You're tracking progress on it

## Source Folders

**Source folders** contain supporting material that doesn't count toward your goals.

### Typical Source Folders

- `research/` - Background research
- `notes/` - Planning and brainstorming
- `character-notes/` - Character development
- `references/` - Quotes and citations
- `worldbuilding/` - Setting details
- `outline/` - Story structure
- `ideas/` - Unused concepts

### When to Use Source

Mark a folder as source if:
- It contains supporting material
- It helps your writing but isn't the writing itself
- You don't want it counting toward goals
- It's research or reference content

## Setting Up Folders

### During Project Creation

When you create a project, you can designate folders immediately:

1. **Create Project** via Command Palette
2. In the project modal, click **Add Content Folder**
3. Select folders from your project
4. Repeat for **Source Folders**

### After Project Creation

You can modify folder designations anytime:

1. Go to **Settings → Lighthouse**
2. Find your project
3. Click **Edit**
4. Add or remove content/source folders
5. Save changes

### From the Dashboard

1. Open **Lighthouse: Open Dashboard**
2. Click **Edit** next to your project
3. Modify folder lists
4. Save

## Folder Paths

Folders are specified **relative to the project root**:

```
Project Root: Projects/My Novel/

Content Folders:
- chapters/          (relative path)
- drafts/final/      (nested folders work too)

Source Folders:
- research/
- notes/planning/
```

The full vault paths would be:
- `Projects/My Novel/chapters/`
- `Projects/My Novel/drafts/final/`

## Nested Folders

Lighthouse respects folder hierarchies:

### All Files Count

```
chapters/            ✅ Content
├── act1/
│   ├── chapter1.md  ✅ Counts
│   └── chapter2.md  ✅ Counts
└── act2/
    └── chapter3.md  ✅ Counts
```

Marking `chapters/` as content includes **all nested files**.

### Mixed Designations

```
manuscript/
├── drafts/          ✅ Content
│   └── draft1.md    ✅ Counts
└── notes/           📚 Source
    └── ideas.md     ❌ Doesn't count
```

You can designate subfolders differently from their parents.

## Best Practices

### Organize Before You Write

Set up your folder structure and designations **before** diving into writing. This ensures accurate counts from day one.

### Be Consistent

Develop a naming convention and stick to it:

```
✅ Good:
- content/
- sources/

✅ Also Good:
- chapters/
- research/

❌ Confusing:
- stuff/
- things/
```

### Review Periodically

As your project evolves, review folder designations:
- Did you add new folders?
- Should any folders switch types?
- Are there obsolete folders to remove?

### Don't Over-Complicate

You don't need to designate every folder. Consider:

**Minimal Approach:**
```
My Project/
└── manuscript/      ✅ Content

(Everything else is ignored)
```

**Detailed Approach:**
```
My Project/
├── chapters/        ✅ Content
├── scenes/          ✅ Content
├── research/        📚 Source
└── notes/           📚 Source
```

Choose the level of detail that works for you.

## Examples

### Novel Project

```
My Novel/
├── manuscript/      ✅ Content
│   ├── act1/
│   ├── act2/
│   └── act3/
├── research/        📚 Source
│   ├── historical-facts/
│   └── character-profiles/
└── planning/        📚 Source
    ├── outline.md
    └── timeline.md
```

### Academic Thesis

```
Thesis/
├── chapters/        ✅ Content
│   ├── introduction.md
│   ├── literature-review.md
│   ├── methodology.md
│   └── conclusion.md
├── drafts/          ✅ Content
│   └── rough-drafts/
└── research/        📚 Source
    ├── papers/
    └── notes/
```

### Blog Series

```
Blog 2024/
├── published/       ✅ Content
├── drafts/          ✅ Content
└── ideas/           📚 Source
    └── topics.md
```

### Technical Documentation

```
Documentation/
├── guides/          ✅ Content
├── api-reference/   ✅ Content
└── internal-notes/  📚 Source
```

## FAQ

**Q: What if I don't designate any folders?**
A: Lighthouse will count all markdown files in your project root. This works, but you'll get more accurate tracking with explicit designations.

**Q: Can I mark the same folder as both content and source?**
A: No. Each folder is either content, source, or undesignated.

**Q: Do nested folders inherit their parent's type?**
A: Only if the parent is explicitly designated. You can override by explicitly designating the child folder differently.

**Q: What about files in the root?**
A: Files in the project root (not in any designated folder) are counted if the root itself is marked as content, otherwise they're ignored.

**Q: Can I change folder types later?**
A: Yes! Word counts will recalculate immediately.

## Next Steps

- Learn about [Word Counting](/core-concepts/word-counting/)
- Explore the [Writing Stats Panel](/features/stats-panel/)
- Read about [Project Management](/features/project-management/)
