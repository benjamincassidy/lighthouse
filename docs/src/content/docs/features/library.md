---
title: The Library
description: Browsing your project as Groups and Sheets
---

# The Library

The Library is Lighthouse's left-sidebar replacement for Obsidian's file explorer while you're in the Writing Workspace — a Ulysses-style browser of Groups and Sheets, scoped to your active project.

## Opening the Library

The Library opens automatically as part of the [Writing Workspace](/features/project-management/#the-writing-workspace). To reopen just this panel if you've closed it without leaving the workspace, run **Lighthouse: Toggle library** from the Command Palette.

While the Library is open, Obsidian's native file explorer is detached — it's restored automatically when you exit the Writing Workspace.

## Header

At the top of the Library:

- **Lighthouse** brand row, with an exit button to leave the Writing Workspace
- The **project name**, in large bold text — switching projects happens via **Lighthouse: Switch project** in the Command Palette, not a picker here
- The **word count goal**, if one is set
- Three icon buttons:
  - **Stats** — a quick popover with sheet count, word count, read time, and speak time for the whole project
  - **New group** — adds a top-level group
  - **⋯** — Edit project…, Export…, Delete project

## Groups and Sheets

Below the header, the Library splits into two columns:

- **Groups** (left) — the folder tree for your project, showing only groups (folders), never individual files
- **Sheets** (right) — the notes inside whichever group is selected

Selecting a group shows its sheets in the right column; both stay visible together at normal sidebar widths. See [Groups & Extras](/core-concepts/groups/) for how groups, nesting, and the Extras group work.

### Groups column

- Each group shows its icon (set via **Edit group…**) and name
- A chevron appears only next to groups that have subgroups; leaf groups stay flush with the same left alignment
- Drag and drop to reorder groups
- Right-click a group for **Edit group…**, **New note**, **New folder**, and **Delete**
- The **Extras** group sits at the bottom, with its own hover-revealed icons for adding a subgroup and collapsing the section

### Sheet List column

- Each sheet is shown as a card: its title (the first line of the file), a preview snippet, a status dot, and a goal ring if a per-file goal is set
- The filename is shown as a secondary detail and in the tooltip, since Obsidian still relies on filenames for links even though the card shows the first-line title
- If the selected group has subgroups with their own files, those files render underneath a label for that subgroup — one level of flattening, so you don't have to drill in just to see everything at a glance
- Drag and drop to reorder sheets within a group
- Right-click a sheet for **Rename**, **Delete**, **Set/Edit file word count goal**, and **Merge into…**
- The **+** in the Sheet List header creates a new note in the selected group

## Responsive layout

The Library adapts to how wide you've resized the sidebar:

- **At normal widths**, both columns are always visible side by side. The Groups column grows with the sidebar up to a fixed maximum, after which only the Sheet List keeps growing.
- **Below roughly 340px**, the Library collapses into a single drilling column, Ulysses-style: it shows Groups until you select one, then swaps to that group's Sheet List with a back button in the header to return.

## Related

- [Groups & Extras](/core-concepts/groups/)
- [The Inspector](/features/inspector/)
- [Splitting & Merging Notes](/features/splitting-and-merging/)
