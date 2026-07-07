---
title: Splitting & Merging Notes
description: Reshape a project's structure without leaving the keyboard
---

# Splitting & Merging Notes

Long-form writing rarely stays in neatly-sized files. Lighthouse lets you split one note into two, or merge two notes back into one, directly from the editor and the Library.

## Splitting a Note

Run **Lighthouse: Split note at cursor** from the Command Palette while editing a file.

- Everything **before** the cursor stays in the original file
- Everything **from the cursor onward** moves into a new sibling file, created next to the original
- The new file is inserted into the project's sheet order immediately after the source, and opens automatically

If there's nothing after the cursor, Lighthouse tells you there's nothing to split into a new note instead of creating an empty file.

## Merging Notes

Right-click any sheet in the Library's Sheet List and choose **Merge into…**. A fuzzy-search picker lists every other markdown file in the active project — pick a target and:

- The source file's content is appended to the target, separated by a horizontal rule (`---`)
- The source file is deleted (moved to Obsidian's trash, so it's recoverable the same way any other deleted note is)
- The source is removed from the project's sheet order
- If the source file was open in a tab, that tab switches to the target file automatically

Merging is one-directional: the source disappears into the target, not the other way around. Pick the target carefully — it's whichever file you select in the picker, not necessarily the file you right-clicked.

## Related

- [The Library](/features/library/)
- [Groups & Extras](/core-concepts/groups/)
