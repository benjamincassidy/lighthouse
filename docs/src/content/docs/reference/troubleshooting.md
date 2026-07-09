---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

## Installation Issues

### Plugin won't appear after installation

**Solution:**
1. If you installed manually, verify all three files are present: `main.js`, `manifest.json`, `styles.css`, and that the folder name is exactly `lighthouse` (lowercase)
2. Restart Obsidian completely
3. Disable Restricted Mode in Settings → Community Plugins

### Plugin won't enable

**Solution:**
1. Open Developer Console (Cmd/Ctrl+Shift+I)
2. Look for error messages
3. Verify Obsidian version is 1.12.0 or later
4. Try reinstalling the plugin
5. Report issues on [GitHub](https://github.com/benjamincassidy/lighthouse/issues)

## Word Count Issues

### Counts seem incorrect

**Solutions:**
- Check whether the file is inside the project's Extras group — Extras is deliberately excluded from all word counts (see [Groups & Extras](/core-concepts/groups/))
- Verify the file is under the project's root folder
- Refresh by switching files or reopening the Inspector's Stats tab
- Verify markdown files have `.md` extension

### Counts don't update

**Solutions:**
- Wait 200ms after stopping typing (debounce delay)
- Verify the file is part of the active project's root folder
- Try closing and reopening the Inspector

### Session/Today counts reset unexpectedly

**Solutions:**
- Session counts reset when Obsidian restarts (expected behavior)
- Today counts persist across restarts and reset at midnight
- If today counts aren't resetting at midnight, check your system date/time

## Project Issues

### Can't see project files in the Library

**Solutions:**
- Verify the project is set as active (**Lighthouse: Switch project**)
- Check the root folder path is still correct — if you moved the folder, update it via **Edit project…**
- Try editing the project and re-saving

### Project or setting missing after an upgrade

Project configurations live in `.obsidian/plugins/lighthouse/data.json`. If a project or setting seems to have disappeared after updating Lighthouse:
- Check that `data.json` still exists and isn't empty
- Verify file permissions allow reading/writing
- Check if vault syncing is interfering with the file (conflicting writes from multiple devices)
- Report on GitHub with your before/after version numbers

## Export Issues

### First export takes a while / seems to hang

PDF and DOCX exports use Pandoc and Typst under the hood. The first time you export to either format, Lighthouse downloads the required tooling automatically — this needs an internet connection and can take a moment depending on your connection. Subsequent exports are fast.

### Citations aren't showing up

- Make sure the project has both a **bibliography file** and a **citation style** set (project editor → Citations)
- Without a bibliography, citation markup is intentionally stripped rather than left broken — set one to enable formatted citations
- See [Exporting & Compiling](/features/exporting/)

## Performance Issues

### Obsidian feels slow with Lighthouse

**Solutions:**
- This shouldn't happen; word counting is heavily optimized
- Check if you have extremely large files (>100k words)
- Try disabling other plugins to isolate the issue
- Report on GitHub with vault size info

## Getting Help

If you can't resolve an issue:

1. Check existing [GitHub Issues](https://github.com/benjamincassidy/lighthouse/issues)
2. Open a new issue with:
   - Obsidian version
   - Lighthouse version
   - Steps to reproduce
   - Error messages from console
3. Join discussions on GitHub
