import { isValidElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { renderSectionBlocks } from "./renderSectionBlocks"

type BlockProps = { id: string; breakBefore: boolean; continuationKey: string }

function blocks(breakBefore?: boolean) {
  return renderSectionBlocks({
    key: "food",
    title: "Food",
    items: ["a", "b", "c"],
    blockId: (item) => `beo-food-${item}`,
    render: (item) => item,
    breakBefore,
  }).map((node) => {
    if (!isValidElement(node)) throw new Error("expected a block")
    return (node as ReactElement<BlockProps>).props
  })
}

describe("renderSectionBlocks", () => {
  it("returns one block per item sharing the continuation key", () => {
    const props = blocks()
    expect(props.map((p) => p.id)).toEqual(["beo-food-a", "beo-food-b", "beo-food-c"])
    expect(props.every((p) => p.continuationKey === "food")).toBe(true)
  })

  it("puts the page break on the first block only, and only when asked", () => {
    expect(blocks(true).map((p) => p.breakBefore)).toEqual([true, false, false])
    expect(blocks().map((p) => p.breakBefore)).toEqual([false, false, false])
  })

  it("returns no blocks for no items", () => {
    expect(
      renderSectionBlocks({ key: "k", title: "T", items: [], blockId: String, render: String }),
    ).toEqual([])
  })
})
