---
title: Installation
description: How to install Lighthouse in your Obsidian vault
---

# Installing Lighthouse

Lighthouse is available in Obsidian's Community Plugins directory. The fastest way to install it is straight from the web listing.

## Prerequisites

- Obsidian v1.12.0 or later
- Basic familiarity with Obsidian's interface

## Install from the Community Plugins website

1. Open the [Lighthouse listing](https://community.obsidian.md/plugins/lighthouse) on the Obsidian Community Plugins website
2. Click **Add to Obsidian** — this opens Obsidian directly and takes you to the plugin's install page
3. Click **Install**, then **Enable**

### Alternative: install from inside Obsidian

1. Go to **Settings → Community plugins**
2. Disable **Restricted Mode** if you haven't already
3. Click **Browse** and search for "Lighthouse"
4. Click **Install**, then **Enable**

## Manual Installation

If you'd rather install the files by hand, or want a specific release:

### Option 1: Download a Release

1. Go to the [Lighthouse GitHub Releases](https://github.com/benjamincassidy/lighthouse/releases) page
2. Download the latest release `.zip` file
3. Extract the archive
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault:
   ```
   YourVault/.obsidian/plugins/lighthouse/
   ```
5. Restart Obsidian
6. Go to **Settings → Community Plugins**
7. Disable **Restricted Mode** if you haven't already
8. Find **Lighthouse** in your installed plugins and enable it

### Option 2: Build from Source

If you want the latest development version:

1. Clone the repository:
   ```bash
   git clone https://github.com/benjamincassidy/lighthouse.git
   cd lighthouse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Copy the built files to your vault:
   ```bash
   # Replace /path/to/vault with your actual vault path
   cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/lighthouse/
   ```

5. Restart Obsidian and enable the plugin

## Verify Installation

Once installed and enabled, you should see:

- A **Lighthouse** icon in the left ribbon (sidebar)
- Lighthouse commands available in the Command Palette (Cmd/Ctrl+P)
- A new **Lighthouse** section in Settings

## Troubleshooting

### Plugin doesn't appear after installation

1. Make sure all three files (`main.js`, `manifest.json`, `styles.css`) are in the correct folder
2. The folder name must be exactly `lighthouse` (lowercase)
3. Try restarting Obsidian completely (quit and reopen)
4. Check that you've disabled Restricted Mode in Settings → Community Plugins

### Plugin won't enable

1. Check the Obsidian console (Cmd/Ctrl+Shift+I) for error messages
2. Ensure you're running Obsidian v1.12.0 or later
3. Try reinstalling the plugin files
4. Report persistent issues on [GitHub Issues](https://github.com/benjamincassidy/lighthouse/issues)

## Next Steps

Now that Lighthouse is installed, let's create your first project! Continue to [Quick Start](/getting-started/quick-start/).
