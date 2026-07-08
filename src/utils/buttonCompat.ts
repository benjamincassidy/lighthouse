import { requireApiVersion, type ButtonComponent } from 'obsidian'

/**
 * Styles a button as destructive, using `setDestructive()` (Obsidian 1.13.0+)
 * when available and falling back to the older `setWarning()` otherwise.
 * Our manifest's minAppVersion predates 1.13.0, so `setDestructive` can't be
 * called unconditionally without breaking older Obsidian installs —
 * requireApiVersion() is Obsidian's own sanctioned way to guard it.
 */
export function setDestructiveButton(button: ButtonComponent): ButtonComponent {
  if (requireApiVersion('1.13.0')) {
    return button.setDestructive()
  }
  // setWarning is deprecated in favor of setDestructive, but this is precisely
  // the fallback path for Obsidian versions where setDestructive doesn't exist.
  return button.setWarning()
}
