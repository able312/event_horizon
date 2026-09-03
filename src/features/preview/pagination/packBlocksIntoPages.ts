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
  /** Prefer keeping this block intact when it fits on a page. */
  keepTogether?: boolean
  /** Optional heading repeated when this block continues onto a later page. */
  continuationKey?: string
}

export type MeasuredBlock = MeasurableBlockMeta & {
  height: number
}

export type PackedPage = {
  blockIds: string[]
  /** IDs of continuation headings to prepend on this page. */
  continuationKeys: string[]
}

/**
 * Pack measured blocks into pages of fixed content height.
 * Oversized blocks are placed alone (caller may allow internal flow).
 * Forced breaks never create blank pages when the next section is empty
 * because empty sections should not emit blocks at all.
 */
export function packBlocksIntoPages(
  blocks: MeasuredBlock[],
  contentHeightPx: number = PAGE_CONTENT_HEIGHT_PX,
): PackedPage[] {
  if (blocks.length === 0) return []

  const pages: PackedPage[] = []
  let current: PackedPage = { blockIds: [], continuationKeys: [] }
  let usedHeight = 0
  let activeContinuationKey: string | undefined

  const pushPage = () => {
    if (current.blockIds.length === 0) return
    pages.push(current)
    current = { blockIds: [], continuationKeys: [] }
    usedHeight = 0
  }

  for (const block of blocks) {
    const needsBreak = Boolean(block.breakBefore) && current.blockIds.length > 0
    const fits = usedHeight + block.height <= contentHeightPx + 0.5

    if (needsBreak) {
      pushPage()
      if (block.continuationKey) {
        current.continuationKeys.push(block.continuationKey)
        activeContinuationKey = block.continuationKey
      }
    } else if (!fits && current.blockIds.length > 0) {
      pushPage()
      if (block.continuationKey || activeContinuationKey) {
        const key = block.continuationKey ?? activeContinuationKey
        if (key) current.continuationKeys.push(key)
      }
    } else if (current.blockIds.length === 0 && block.continuationKey) {
      current.continuationKeys.push(block.continuationKey)
      activeContinuationKey = block.continuationKey
    }

    // Oversized single block: place alone so we never loop forever.
    if (block.height > contentHeightPx && current.blockIds.length > 0) {
      pushPage()
      if (block.continuationKey) {
        current.continuationKeys.push(block.continuationKey)
        activeContinuationKey = block.continuationKey
      }
    }

    current.blockIds.push(block.id)
    usedHeight += block.height

    if (block.continuationKey) {
      activeContinuationKey = block.continuationKey
    }

    if (block.height > contentHeightPx) {
      pushPage()
    }
  }

  pushPage()
  return pages
}
