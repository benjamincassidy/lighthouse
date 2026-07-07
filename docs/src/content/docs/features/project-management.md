---
title: Project Management
description: The Writing Workspace, and creating, editing, and managing projects
---

# Project Management

Learn how to enter the Writing Workspace, and create, edit, switch between, and delete Lighthouse projects.

## The Writing Workspace

The Writing Workspace is Lighthouse's dedicated layout for long-form writing: the [Library](/features/library/) in the left sidebar, the [Inspector](/features/inspector/) in the right sidebar, and Obsidian's normal editor in between, untouched.

### Entering and Exiting

- Click the compass icon in the left ribbon to toggle the workspace on or off
- Or run **Lighthouse: Open writing workspace** / **Lighthouse: Exit writing workspace** from the Command Palette

Entering the workspace detaches Obsidian's native file explorer for the duration (it's restored automatically when you exit) and opens the Library and Inspector. Both panels can be closed individually without leaving the workspace — use **Lighthouse: Toggle library** or **Lighthouse: Toggle inspector** to bring one back.

The workspace's active/inactive state persists across Obsidian restarts, so it reopens exactly as you left it.

## Creating Projects

### Via Command Palette
1. Press Cmd/Ctrl+P
2. Run `Lighthouse: Create new project`
3. Fill in the project modal and click **Create project**

### Via Settings
1. Go to Settings → Lighthouse
2. Click **Create project**
3. Set up your project

## Editing Projects

To modify an existing project:

- In the Library, open the project's "⋯" menu and choose **Edit project…**, or
- Go to Settings → Lighthouse, select the project from the dropdown, and click **Edit**

You can edit:
- Project name
- Root folder
- Word count goal, goal direction, deadline, and daily goal
- Group goals
- Bibliography file and citation style

## Switching Projects

The active project is your current working context.

### From Command Palette
1. Press Cmd/Ctrl+P
2. Run `Lighthouse: Switch project`
3. Type to search for your project
4. Press Enter to switch

The fuzzy search makes it easy to find projects quickly, even if you have many.

### From Settings
Go to Settings → Lighthouse and pick a different project from the **Active project** dropdown.

Your active project persists across sessions, including the last group you had selected in the Library.

## Deleting Projects

To remove a project:

- In the Library, open the project's "⋯" menu and choose **Delete project**, or
- Go to Settings → Lighthouse, select the project, and click **Delete**

Either way you'll be asked to confirm. **Important:** Only the project configuration is deleted. Your files remain untouched.

## Related

- [The Library](/features/library/)
- [The Inspector](/features/inspector/)
- [Projects](/core-concepts/projects/)
