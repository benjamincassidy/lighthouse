/**
 * Utilities for custom file ordering in the Project Explorer.
 */

interface Sortable {
  path: string
  name: string
  type: 'file' | 'folder'
}

/**
 * Sort items by their position in a custom file order array.
 * Items not present in fileOrder are appended after ordered items:
 * folders first, then files, both sorted alphabetically.
 */
export function sortByFileOrder<T extends Sortable>(items: T[], fileOrder: string[]): T[] {
  return [...items].sort((a, b) => {
    const aIdx = fileOrder.indexOf(a.path)
    const bIdx = fileOrder.indexOf(b.path)

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1 // a is ordered, b is not → a first
    if (bIdx !== -1) return 1 // b is ordered, a is not → b first

    // Neither is ordered: folders before files, then alphabetical
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Produce a new order array by moving draggedPath before or after targetPath.
 *
 * Any paths present in allPaths but absent from order are first appended at the
 * end of order (so newly created files always participate in the sort), then
 * the move is applied.
 */
export function reorderPaths(
  order: string[],
  allPaths: string[],
  draggedPath: string,
  targetPath: string,
  position: 'before' | 'after',
): string[] {
  // Ensure every known path is represented
  const baseOrder = [...order]
  for (const p of allPaths) {
    if (!baseOrder.includes(p)) baseOrder.push(p)
  }

  // Remove the dragged item from its current position
  const filtered = baseOrder.filter((p) => p !== draggedPath)

  // Find where to insert it relative to the target
  const targetIdx = filtered.indexOf(targetPath)
  if (targetIdx === -1) {
    // Target not found — append at end
    return [...filtered, draggedPath]
  }

  const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
  return [...filtered.slice(0, insertIdx), draggedPath, ...filtered.slice(insertIdx)]
}
