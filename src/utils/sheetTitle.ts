/**
 * Derives a Sheet List row title from a file's first line, Ulysses-style.
 * Strips common leading markdown syntax (headings, list markers, blockquotes)
 * and falls back to the filename when the line is blank or empty after stripping.
 */
export function deriveSheetTitle(firstLine: string | undefined, filenameNoExt: string): string {
  const stripped = (firstLine ?? '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^>\s+/, '')
    .trim()

  return stripped.length > 0 ? stripped : filenameNoExt
}
