---
title: Flow Mode
description: Distraction-free writing with Lighthouse
---

# Flow Mode

Flow Mode provides a truly distraction-free writing experience by hiding UI elements except your writing.

## What Flow Mode Hides

When you enable Flow Mode, Lighthouse hides:

- **Sidebars:** Both left and right sidebars collapse
- **Ribbon:** The left icon bar disappears (configurable)
- **Status Bar:** Bottom status bar is hidden (configurable)
- **Tabs:** Tab headers become invisible (but reappear on hover)
- **Navigation:** Breadcrumbs and back/forward arrows hide
- **Sidebar Toggles:** Sidebar toggle buttons disappear

## Using Flow Mode

### Toggle Flow Mode

**Via Command Palette:**
1. Press Cmd/Ctrl+P
2. Run `Lighthouse: Toggle flow mode`
3. Your workspace transforms into a clean writing space

**Via Keyboard Shortcut (Optional):**
You can assign a hotkey in Settings → Hotkeys → Lighthouse: Toggle flow mode

### Exiting Flow Mode

Simply toggle Flow Mode again using the same command. All UI elements return to their previous state — including whichever sidebars were open before you entered.

## Typography Options

Flow Mode can also change how the editor looks while it's active. Configure these in **Settings → Lighthouse → Typography**:

- **Font family** — override the editor font (e.g. `"iA Writer Quattro V"`); leave blank to inherit your normal theme font
- **Line height** — a custom line-height multiplier; `0` inherits the theme default
- **Max line width** — constrain the editor to a comfortable reading width, in pixels; `0` inherits the theme default

### Typewriter Scroll

When enabled (on by default), the active line stays vertically centred as you type, so your eyes and cursor stay in the same place on screen instead of creeping toward the bottom of the window.

## Features

### Invisible Tabs with Hover

Tabs are hidden (0% opacity) but become visible when you hover over the tab bar. This lets you switch between files when needed without visual distraction.

### State Preservation

Flow Mode remembers which sidebars, ribbon, and status bar were visible before enabling, and restores only those when you exit. If your right sidebar was already closed, it won't suddenly open when you exit Flow Mode.

## Tips

- **Focus on writing:** Use Flow Mode when you need to eliminate all distractions and just write
- **Quick access:** Set a keyboard shortcut for instant toggling
- **Combine with fullscreen:** Use Obsidian's fullscreen mode (View → Toggle Fullscreen) along with Flow Mode for maximum focus
- **Check word counts before you go in:** The status bar word count and the Inspector are both hidden by default in Flow Mode — check your progress before toggling in, or turn off "Hide status bar" in settings if you want it visible while you write

## Compatibility

Flow Mode works alongside other focus/zen plugins. If you're using another plugin that modifies the UI, the effects will stack. Toggle Lighthouse's Flow Mode off if you want to use a different plugin's focus mode.
