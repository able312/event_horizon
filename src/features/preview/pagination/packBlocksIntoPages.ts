/** US Letter at 96 CSS px/inch */
export const LETTER_WIDTH_PX = 816
export const LETTER_HEIGHT_PX = 1056
export const PAGE_MARGIN_PX = 72 // 0.75in
export const PAGE_CONTENT_WIDTH_PX = LETTER_WIDTH_PX - PAGE_MARGIN_PX * 2
export const PAGE_CONTENT_HEIGHT_PX = LETTER_HEIGHT_PX - PAGE_MARGIN_PX * 2

export type MeasurableBlockMeta = {
  id: string
  /** Force this block onto a new page when it has content. */
  breakBefore?: boolean
  /**
   * Prefer keeping this block intact when it fits on a page.
   * Oversized blocks still continue onto subsequent pages.
   */
  keepTogether?: boolean
  /** Optional heading repeated when this block continues onto a later page. */
  continuationKey?: string
}

export type MeasuredBlock = MeasurableBlockMeta & {
  height: number
  /** Safe vertical offsets between rendered lines or rows. */
  breakOffsets?: number[]
}

export type BlockFragment = { offset: number; height: number }

export type PackedPage = {
  blockIds: string[]
  /** IDs of continuation headings to prepend on this page. */
  continuationKeys: string[]
  /** Only split blocks need a viewport into their original content. */
  fragments?: Record<string, BlockFragment>
}

export type PackBlocksOptions = {
  contentHeightPx?: number
  /** Measured heights of continuation heading nodes keyed by continuationKey. */
  continuationHeadingHeights?: Record<string, number>
}

/**
 * Pack measured blocks into pages of fixed content height.
 *
 * Keep blocks intact when they fit. Larger blocks are divided at measured
 * line/row boundaries, with contiguous fragments covering all their content.
 * Forced breaks never create blank pages when the next section is empty
 * because empty sections should not emit blocks at all.
 */
export function packBlocksIntoPages(
  blocks: MeasuredBlock[],
  contentHeightPxOrOptions: number | PackBlocksOptions = PAGE_CONTENT_HEIGHT_PX,
): PackedPage[] {
  if (blocks.length === 0) return []

  const options: PackBlocksOptions =
    typeof contentHeightPxOrOptions === "number"
      ? { contentHeightPx: contentHeightPxOrOptions }
      : contentHeightPxOrOptions

  const contentHeightPx = options.contentHeightPx ?? PAGE_CONTENT_HEIGHT_PX
  if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) {
    throw new RangeError("Page content height must be positive and finite")
  }
  const continuationHeadingHeights = options.continuationHeadingHeights ?? {}

  const pages: PackedPage[] = []
  let current: PackedPage = { blockIds: [], continuationKeys: [] }
  let usedHeight = 0

  const headingHeightFor = (key: string | undefined): number => {
    if (!key) return 0
    return continuationHeadingHeights[key] ?? 0
  }

  const availableHeight = (): number => {
    const headingBudget = current.continuationKeys.reduce(
      (sum, key) => sum + headingHeightFor(key),
      0,
    )
    return contentHeightPx - headingBudget
  }

  const pushPage = () => {
    if (current.blockIds.length === 0) return
    pages.push(current)
    current = { blockIds: [], continuationKeys: [] }
    usedHeight = 0
  }

  /**
   * Open a new page mid-section and prepend the continuation heading.
   * Only the incoming block's own key is used — a keyless block means a new
   * section and must not inherit the prior section's "(continued)" heading.
   */
  const openContinuationPage = (block: MeasuredBlock) => {
    pushPage()
    if (block.continuationKey && headingHeightFor(block.continuationKey) < contentHeightPx) {
      current.continuationKeys.push(block.continuationKey)
    }
  }

  for (const block of blocks) {
    const pageNonEmpty = current.blockIds.length > 0
    const needsBreak = Boolean(block.breakBefore) && pageNonEmpty
    const fits = usedHeight + block.height <= availableHeight()

    if (needsBreak) {
      // Fresh section start — do not show "(continued)" on this page.
      pushPage()
    } else if (!fits && pageNonEmpty) {
      openContinuationPage(block)
    }

    let offset = 0
    const breakOffsets = (block.breakOffsets ?? [])
      .filter((value) => Number.isFinite(value) && value > 0 && value < block.height)
      .sort((a, b) => a - b)
    do {
      const capacity = availableHeight() - usedHeight
      const remaining = block.height - offset
      let height = Math.min(remaining, capacity)
      if (remaining > capacity) {
        const safeEnd = [...breakOffsets].reverse().find((value) => value > offset && value <= offset + capacity)
        if (safeEnd !== undefined) height = safeEnd - offset
      }
      current.blockIds.push(block.id)
      if (offset > 0 || height < block.height) {
        current.fragments ??= {}
        current.fragments[block.id] = { offset, height }
      }
      usedHeight += height
      offset += height
      if (offset < block.height) openContinuationPage(block)
    } while (offset < block.height)
  }

  pushPage()
  return pages
}
