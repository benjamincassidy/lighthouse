---
title: Groups & Extras
description: How Lighthouse organizes a project's files
---

# Groups & Extras

Lighthouse organizes each project's files the way [Ulysses](https://ulysses.app/) does: into **Groups** (folders that can nest) containing **Sheets** (your notes), plus a single **Extras** group set aside for material that isn't part of the word count.

## The Core Concept

Every subfolder inside a project's root becomes a **Group** in the Library. Selecting a group shows its notes — its **Sheets** — in the column beside it. Groups can nest inside other groups, just like folders.

One group is special: **Extras**. Every project gets one automatically, and its contents are excluded from word counts.

```
My Novel/                (project root)
├── Chapters/             ✅ Group — counts toward your goal
│   ├── Act 1/            ✅ Nested group — counts
│   └── Act 2/            ✅ Nested group — counts
├── Notes/                ✅ Group — counts toward your goal
└── Extras/                excluded — research, character sheets, outlines
```

Everything under the root counts **except** Extras. There's no per-folder toggle to configure — Extras is the one exception, and it's provisioned for you the first time you open a new project in the Library.

## Why This Matters

Imagine a novel project without any exclusion:

```
My Novel/
├── Chapters/           (50,000 words — your manuscript)
├── Research/           (30,000 words — character notes)
└── References/         (20,000 words — historical facts)

Total: 100,000 words
```

If your goal is 80,000 words, this shows 125% complete — but you've only written 50,000 words of actual prose. Put the research and reference material in Extras and your project total becomes exactly 50,000: 63% of goal, an honest number.

## Working with Groups

### Creating a Group

- Click the **+** icon in the Library header to add a top-level group, or
- Right-click an existing group and choose **New group** to nest one inside it

Either way, a dialog asks for a name and an icon before the folder is actually created — nothing is added to your vault until you click **Done**.

### Editing a Group

Right-click any group and choose **Edit group…** to rename it or change its icon. Renaming updates the underlying folder (and any goals or icons you've set) via Obsidian's own rename, so links elsewhere in your vault stay intact.

### Nesting

Groups can contain other groups to any depth — a "Chapters" group might contain "Act 1" and "Act 2", each with their own sheets. The Library shows a chevron next to any group with subgroups; leaf groups show no chevron but keep the same alignment.

### Deleting a Group

Right-click and choose **Delete**. This deletes the underlying folder and its contents from your vault via Obsidian, so treat it like deleting a folder anywhere else in Obsidian.

## Working with Extras

Extras behaves like any other group — you can add subgroups inside it, and its header has hover-revealed icons for adding a new group or collapsing the whole section. The only difference is that its word counts never contribute to the project total, goal ring, or heatmap.

Use Extras for:
- Research and reference notes
- Character sheets and worldbuilding
- Outlines and planning documents
- Anything you want in the project but don't want inflating your count

## Sheets & Titles

A **Sheet** is just a markdown note inside a group. In the Sheet List, each sheet's title is derived from the **first line of the file** — Ulysses-style — with the filename shown as a secondary detail (and in the tooltip), since Obsidian relies on filenames for links even though the display title doesn't.

## FAQ

**Q: Can I rename or move the Extras group?**
A: Extras is tracked as a single subfolder path on the project; if you rename its folder in Obsidian, Lighthouse follows the rename automatically.

**Q: Can I have more than one Extras group?**
A: No — Extras is a single designated folder per project, matching Ulysses' model.

**Q: Do nested groups inherit anything from their parent?**
A: Only membership in the project (and Extras exclusion, if nested under Extras). Goals and icons are set per-group.

**Q: What happens to files directly in the project root, outside any group?**
A: They're counted as part of the project total and shown ungrouped at the top of that level's Sheet List.

## Next Steps

- Learn about [Word Counting](/core-concepts/word-counting/)
- Explore the [Library](/features/library/)
- Read about [Project Management](/features/project-management/)
