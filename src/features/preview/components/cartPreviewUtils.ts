/** Standard 12-hole shotgun template including lead carts. */
export const STANDARD_CART_TEMPLATE: (number | string | null)[][] = [
  [7, 5, 9, 10, 3, 1],
  [7, 5, 9, 10, 3, 1],
  [7, 5, 9, 10, 3, 1],
  [7, 5, 9, 10, 3, 1],
  [8, 6, 12, 11, 4, 2],
  [8, 6, 12, 11, 4, 2],
  [8, 6, 12, 11, 4, 2],
  [8, 6, 12, 11, 4, 2],
  ["Lead", null, "Lead", null, "Lead", null],
]

export const CART_KEYS_WARNING =
  "⚠️ DO NOT leave keys in carts or hand out keys before tournament start time"

export function resolveCartGrid(
  customGrid: (number | string | null)[][] | null | undefined,
): (number | string | null)[][] {
  if (customGrid && customGrid.length > 0) return customGrid
  return STANDARD_CART_TEMPLATE
}

/** Count every occupied cell, including Lead carts. */
export function countRequiredCarts(grid: (number | string | null)[][]): number {
  return grid.flat().filter((cell) => cell !== null && cell !== undefined && cell !== "").length
}
