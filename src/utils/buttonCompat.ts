import type { ButtonComponent } from 'obsidian'

/**
 * Styles a button as destructive, using `setDestructive()` (Obsidian 1.13.0+)
 * when available and falling back to the older `setWarning()` otherwise.
 * Our manifest's minAppVersion predates 1.13.0, so `setDestructive` can't be
 * called unconditionally without breaking older Obsidian installs.
 */
export function setDestructiveButton(button: ButtonComponent): ButtonComponent {
  const withDestructive = button as ButtonComponent & { setDestructive?: () => ButtonComponent }
  if (typeof withDestructive.setDestructive === 'function') {
    return withDestructive.setDestructive()
  }
  // setWarning is deprecated in favor of setDestructive, but this is precisely
  // the fallback path for Obsidian versions where setDestructive doesn't exist.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return button.setWarning()
}
