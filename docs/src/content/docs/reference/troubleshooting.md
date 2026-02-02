---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

## Installation Issues

### Plugin won't appear after installation

**Solution:**
1. Verify all three files are present: `main.js`, `manifest.json`, `styles.css`
2. Check folder name is exactly `lighthouse` (lowercase)
3. Restart Obsidian completely
4. Disable Restricted Mode in Settings → Community Plugins

### Plugin won't enable

**Solution:**
1. Open Developer Console (Cmd/Ctrl+Shift+I)
2. Look for error messages
3. Verify Obsidian version is 1.0.0 or later
4. Try reinstalling the plugin
5. Report issues on [GitHub](https://github.com/benjamincassidy/lighthouse/issues)

## Word Count Issues

### Counts seem incorrect

**Solutions:**
- Verify content/source folder designations are correct
- Check that folders are relative to project root
- Refresh by switching files or reopening the Stats Panel
- Verify markdown files have `.md` extension

### Counts don't update

**Solutions:**
- Wait 200ms after stopping typing (debounce delay)
- Check that the file is in a content folder
- Verify the file is part of the active project
- Try closing and reopening the Stats Panel

### Session/Today counts reset unexpectedly

**Solutions:**
- Session counts reset when Obsidian restarts (expected behavior)
- Today counts persist across restarts and reset at midnight
- If today counts aren't resetting at midnight, check your system date/time

## Project Issues

### Can't see project files in stats

**Solutions:**
- Verify the project is set as active
- Check folder paths are correct relative to project root
- Ensure folders are designated as content folders
- Try editing the project and re-saving

### Project disappeared after restart

**Note:** This issue was fixed in version 1.0.4.

**If you're on an older version:**
- Upgrade to 1.0.4 or later to prevent this issue
- Your project data should persist correctly after upgrading

**If still experiencing issues on 1.0.4+:**
- Check if `.obsidian/plugins/lighthouse/data.json` exists
- Verify file permissions allow reading/writing
- Check if vault syncing is interfering with the file
- Report on GitHub with version info

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

*More troubleshooting tips coming soon.*
