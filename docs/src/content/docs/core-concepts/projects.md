---
title: Projects
description: Understanding Lighthouse projects
---

# Projects

Projects are the foundation of Lighthouse. A project represents a distinct writing endeavor with its own configuration, goals, and tracking.

## What is a Project?

A Lighthouse project is:

- **A collection of folders** in your vault that belong together
- **A configuration** specifying which folders are content vs source
- **A goal** (optional) to track your progress
- **A context** that persists across Obsidian sessions

Projects are **not** physical folders—they're metadata stored by Lighthouse. Your actual files and folders remain untouched.

## Why Use Projects?

### Isolation
Each project is independent. You can:
- Track separate word counts for different manuscripts
- Switch focus without mixing up progress
- Archive completed projects without losing history

### Flexibility
Projects adapt to your workflow:
- No required folder structure
- Folders can be anywhere in your vault
- Move and reorganize files freely
- Mix multiple projects in one vault

### Focus
The active project provides context:
- Word counts reflect only project files
- Stats panel shows project progress
- Dashboard filters to relevant data
- (Future) File explorer can filter to project files

## Project Anatomy

Every project has:

| Property | Description | Required |
|----------|-------------|----------|
| **Name** | Human-readable identifier | Yes |
| **Root Path** | Base folder in your vault | Yes |
| **Content Folders** | Folders that count toward goals | No (but recommended) |
| **Source Folders** | Research/reference folders | No |
| **Word Count Goal** | Target word count | No |

### Root Path

The root path is your project's home folder. All other folders in the project are relative to this path.

**Example:**
```
Root Path: Projects/My Novel/
Content Folders: chapters/, drafts/
Source Folders: research/, notes/
```

### Content vs Source Folders

See [Content vs Source Folders](/core-concepts/folders/) for detailed explanation.

## Creating Projects

### From Command Palette

1. Open Command Palette (Cmd/Ctrl+P)
2. Run **Lighthouse: Create Project**
3. Fill in the modal:
   - **Name:** Your project's name
   - **Root Path:** Choose or create a folder
   - **Content/Source Folders:** Designate now or later
   - **Word Count Goal:** Optional target

### From Dashboard

1. Open **Lighthouse: Open Dashboard**
2. Click **+ New** button
3. Fill in the project modal

### From Settings

1. Go to **Settings → Lighthouse**
2. Click **Create New Project**
3. Configure your project

## Managing Projects

### Switching Projects

The **active project** is the project you're currently working on. To switch:

1. Open the Dashboard
2. Select a different project from the dropdown

Or use the command: **Lighthouse: Switch Project**

Your active project persists across sessions—Lighthouse remembers where you left off.

### Editing Projects

To change project settings:

1. Go to **Settings → Lighthouse**, or
2. Open the Dashboard and click **Edit**

You can modify:
- Project name
- Root path (careful—can break folder references!)
- Content/source folder designations
- Word count goal

### Deleting Projects

To delete a project:

1. Open Settings or Dashboard
2. Click **Delete** next to the project
3. Confirm the deletion

**Important:** Deleting a project only removes Lighthouse's configuration. Your actual files and folders are **not deleted**.

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
3. **Separate root paths:** Avoid overlapping project folders when possible
4. **Archive when done:** Delete completed project configs to reduce clutter

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
A: Technically yes, if you set up overlapping root paths. However, this isn't recommended as it can lead to confusing word counts.

**Q: What happens if I move a folder?**
A: You'll need to update the folder path in project settings. Lighthouse uses paths relative to the root, so moving the entire root folder is safe, but moving individual folders requires updates.

**Q: Can I export/import project configs?**
A: Not yet, but this is planned for a future release.

**Q: Do projects sync across devices?**
A: If you sync `.obsidian/plugins/lighthouse/data.json` (via Obsidian Sync, iCloud, Git, etc.), your project configs will sync.

## Next Steps

- Learn about [Content vs Source Folders](/core-concepts/folders/)
- Understand [Word Counting](/core-concepts/word-counting/)
- Explore the [Project Dashboard](/features/dashboard/)
