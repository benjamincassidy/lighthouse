---
title: Projects
description: Understanding Lighthouse projects
---

# Projects

Projects are the foundation of Lighthouse. A project represents a distinct writing endeavor with its own configuration, goals, and tracking.

## What is a Project?

A Lighthouse project is:

- **A single root folder** in your vault, plus everything nested inside it
- **A configuration** — goals, deadline, citation settings, and more
- **A goal** (optional) to track your progress
- **A context** that persists across Obsidian sessions

Projects are **not** physical folders in the sense of requiring a special structure — a project is just metadata pointing at a folder you already have. Your actual files and folders remain untouched.

## Why Use Projects?

### Isolation
Each project is independent. You can:
- Track separate word counts for different manuscripts
- Switch focus without mixing up progress
- Remove completed projects without losing your files

### Flexibility
Projects adapt to your workflow:
- No required folder structure below the root
- The root folder can be anywhere in your vault
- Move and reorganize files freely — Lighthouse follows renames
- Mix multiple projects in one vault

### Focus
The active project provides context:
- Word counts reflect only project files
- The Library shows only this project's Groups and Sheets
- The Inspector's stats, heatmap, and streak are scoped to it

## Project Anatomy

Every project has:

| Property | Description | Required |
|----------|-------------|----------|
| **Name** | Human-readable identifier | Yes |
| **Root folder** | Base folder in your vault | Yes |
| **Extras** | A single subfolder (auto-created) excluded from word counts | Automatic |
| **Word count goal** | Target word count | No |
| **Deadline & daily goal** | Used for pacing and the writing heatmap | No |
| **Bibliography & citation style** | Used when exporting with citations | No |

### Root Folder

The root folder is your project's home. Everything inside it — at any depth — belongs to the project and counts toward its word total, **except** the Extras group.

**Example:**
```
Root: Projects/My Novel/
├── Chapters/       (counts toward your goal)
├── Notes/          (counts toward your goal — it's just another group)
└── Extras/         (excluded — research, character sheets, outlines)
```

### Groups & Extras

See [Groups & Extras](/core-concepts/groups/) for how the root folder's subfolders become Groups in the Library, and why every project has a built-in Extras group.

## Creating Projects

### From the Command Palette

1. Open Command Palette (Cmd/Ctrl+P)
2. Run **Lighthouse: Create new project**
3. Fill in the modal:
   - **Project name**
   - **Root folder** — choose or create a folder
   - **Citations, goals, deadline** — configure now or later
4. Click **Create project**

### From the Library

Once you're in the Writing Workspace, open the active project's "⋯" menu in the Library header and choose **Edit project…** to change settings, or use **Lighthouse: Create new project** from the Command Palette to start a new one.

### From Settings

1. Go to **Settings → Lighthouse**
2. Click **Create project**
3. Configure your project

## Managing Projects

### Switching Projects

The **active project** is the project you're currently working on. To switch:

- Run **Lighthouse: Switch project** from the Command Palette and fuzzy-search by name, or
- Go to **Settings → Lighthouse** and pick a project from the **Active project** dropdown

Your active project persists across sessions — Lighthouse remembers where you left off, including the last group you had selected in the Library.

### Editing Projects

To change project settings:

- Open the project's "⋯" menu in the Library header and choose **Edit project…**, or
- Go to **Settings → Lighthouse**, select the project, and click **Edit**

You can modify the name, root folder, goals, deadline, daily goal, bibliography, and citation style.

### Deleting Projects

To remove a project:

- Open the project's "⋯" menu in the Library header and choose **Delete project**, or
- Go to **Settings → Lighthouse** and click **Delete** next to the project

Either way you'll be asked to confirm. **Important:** only the project configuration is removed. Your actual files and folders are **not deleted**.

## Multiple Projects

You can run multiple projects simultaneously in the same vault:

### Use Cases

**Separate Manuscripts**
```
- Project 1: "Novel - First Draft"
- Project 2: "Short Stories Collection"
- Project 3: "Blog Posts 2024"
```

**Phases of Work**
```
- Project 1: "Thesis - Research Phase"
- Project 2: "Thesis - Writing Phase"
- Project 3: "Thesis - Revision Phase"
```

**Different Types**
```
- Project 1: "Fiction Writing"
- Project 2: "Technical Documentation"
- Project 3: "Personal Journal"
```

### Best Practices

1. **One active project at a time:** Focus on what you're currently writing
2. **Clear naming:** Use descriptive names that indicate content
3. **Separate root folders:** Avoid overlapping project roots when possible
4. **Delete when done:** Remove completed project configs to reduce clutter — your files are safe either way

## Project Data Storage

Project configurations are stored in Obsidian's plugin data:

```
YourVault/.obsidian/plugins/lighthouse/data.json
```

This file contains:
- All project configurations
- Active project ID
- Plugin settings

**Backup Recommendation:** Include `.obsidian/plugins/` in your vault backups to preserve project configurations.

## FAQ

**Q: Can files belong to multiple projects?**
A: Technically yes, if you set up overlapping root folders. However, this isn't recommended as it can lead to confusing word counts.

**Q: What happens if I move or rename a folder inside the project?**
A: Lighthouse listens for vault rename events and updates group goals, icons, and the Library automatically. Moving the root folder itself requires updating the project's root in **Edit project…**.

**Q: Can I export/import project configs?**
A: Not yet, but this is planned for a future release.

**Q: Do projects sync across devices?**
A: If you sync `.obsidian/plugins/lighthouse/data.json` (via Obsidian Sync, iCloud, Git, etc.), your project configs will sync.

## Next Steps

- Understand [Groups & Extras](/core-concepts/groups/)
- Learn about [Word Counting](/core-concepts/word-counting/)
- Explore the [Library](/features/library/)
