import type { ReactNode } from "react"

import {
  SectionFrameHeading,
  SectionFrameItem,
} from "~/features/preview/components/SectionFrame"
import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"

/**
 * One framed BEO section as a run of PreviewBlocks, one per item: the first block carries the
 * section heading (and the page break, when `breakBefore` is set), the last closes the frame,
 * and all share `key` as their continuation key so a page that starts mid-section repeats the
 * heading. Returns blocks (not a component) because PreviewDocument paginates its direct blocks.
 * Items are usually timeblocks, but any list works (the Full BEO's beverage section mixes
 * timeblocks and bar lists).
 */
export function renderSectionBlocks<T>(params: {
  key: string
  title: string
  items: T[]
  /** The block id; also its React key. */
  blockId: (item: T) => string
  render: (item: T, index: number) => ReactNode
  breakBefore?: boolean
}): ReactNode[] {
  const { key, title, items, blockId, render, breakBefore = false } = params

  return items.map((item, index) => {
    const isFirst = index === 0
    const id = blockId(item)
    return (
      <PreviewBlock key={id} id={id} breakBefore={breakBefore && isFirst} continuationKey={key}>
        {isFirst ? <SectionFrameHeading title={title} /> : null}
        <SectionFrameItem isLast={index === items.length - 1}>{render(item, index)}</SectionFrameItem>
      </PreviewBlock>
    )
  })
}
