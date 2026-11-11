/**
 * Name order for the venue's saved menus (beverages, food items, categories):
 * case-insensitive, with unnamed rows (still being typed) last so a new row
 * doesn't jump to the top.
 */
export function compareMenuItemNames(a: string, b: string): number {
  const nameA = a.trim()
  const nameB = b.trim()
  if (!nameA || !nameB) return nameA ? -1 : nameB ? 1 : 0
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" })
}
