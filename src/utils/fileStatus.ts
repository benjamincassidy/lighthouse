/**
 * Maps `status:` frontmatter values to CSS custom-property colors.
 *
 * Any value not in the map falls back to `--text-faint` so unknown statuses
 * are visible but unobtrusive.
 *
 * The values are CSS custom-property references so they automatically adapt to
 * the active Obsidian theme (light / dark) without any extra work.
 */
export const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--color-red)',
  revising: 'var(--color-yellow)',
  revised: 'var(--color-yellow)',
  editing: 'var(--color-yellow)',
  done: 'var(--color-green)',
  complete: 'var(--color-green)',
  published: 'var(--color-green)',
}

/**
 * Returns the dot color for a given status string.
 * Case-insensitive. Returns `var(--text-faint)` for unknown values.
 */
export function getStatusColor(status: string | undefined | null): string | null {
  if (!status) return null
  return STATUS_COLORS[status.toLowerCase().trim()] ?? 'var(--text-faint)'
}
