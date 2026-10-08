/** Vertical intervals occupied by text, table rows, or replaced elements. */
export type ContentInterval = { top: number; bottom: number }

/** Find gaps without cutting through overlapping text in adjacent columns. */
export function getSafeBreakOffsets(intervals: ContentInterval[], height: number): number[] {
  const sorted = intervals
    .filter((interval) => interval.bottom > interval.top)
    .sort((a, b) => a.top - b.top)
  const merged: ContentInterval[] = []
  for (const interval of sorted) {
    const previous = merged[merged.length - 1]
    if (previous && interval.top < previous.bottom) {
      previous.bottom = Math.max(previous.bottom, interval.bottom)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged.map((interval, index) => {
    const nextTop = merged[index + 1]?.top ?? height
    return Math.min(height, (interval.bottom + nextTop) / 2)
  }).filter((offset) => offset > 0 && offset < height)
}

/** Measure actual line boxes, preserving table rows that fit on a page. */
export function measureBlockBreaks(root: HTMLElement, capacity: number): number[] {
  const rect = root.getBoundingClientRect()
  const intervals: ContentInterval[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let text = walker.nextNode()
  while (text) {
    if (text.textContent?.trim()) {
      range.selectNodeContents(text)
      for (const line of Array.from(range.getClientRects())) {
        intervals.push({ top: line.top - rect.top, bottom: line.bottom - rect.top })
      }
    }
    text = walker.nextNode()
  }
  root.querySelectorAll<HTMLElement>("tr, img, svg, [data-preview-keep-together]").forEach((node) => {
    const bounds = node.getBoundingClientRect()
    // A row taller than the page must be allowed to split between its text lines.
    if (bounds.height <= capacity) {
      intervals.push({ top: bounds.top - rect.top, bottom: bounds.bottom - rect.top })
    }
  })
  return getSafeBreakOffsets(intervals, rect.height)
}
