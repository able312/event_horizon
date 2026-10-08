/**
 * How many stacked items fit in a clipped container, given each item's bottom edge
 * measured from the container's top. Always shows at least one item so a busy
 * day never looks empty. Returns itemBottoms.length when the container is unmeasured.
 */
export function countItemsThatFit(containerHeight: number, itemBottoms: number[]): number {
  if (containerHeight <= 0) return itemBottoms.length

  const fittingCount = itemBottoms.findIndex((bottom) => bottom > containerHeight)
  if (fittingCount === -1) return itemBottoms.length
  return Math.max(1, fittingCount)
}
