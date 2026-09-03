import { describe, expect, it } from "vitest"

import { packBlocksIntoPages } from "./packBlocksIntoPages"

describe("packBlocksIntoPages", () => {
  it("packs blocks that fit onto one page", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 100 },
        { id: "b", height: 100 },
      ],
      300,
    )

    expect(pages).toEqual([{ blockIds: ["a", "b"], continuationKeys: [] }])
  })

  it("moves overflow onto the next page", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 200 },
        { id: "b", height: 200 },
      ],
      300,
    )

    expect(pages).toHaveLength(2)
    expect(pages[0]?.blockIds).toEqual(["a"])
    expect(pages[1]?.blockIds).toEqual(["b"])
  })

  it("honors forced breaks without creating blank pages", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 50 },
        { id: "b", height: 50, breakBefore: true },
      ],
      300,
    )

    expect(pages).toEqual([
      { blockIds: ["a"], continuationKeys: [] },
      { blockIds: ["b"], continuationKeys: [] },
    ])
  })

  it("places oversized blocks alone", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 50 },
        { id: "big", height: 500 },
      ],
      300,
    )

    expect(pages.map((page) => page.blockIds)).toEqual([["a"], ["big"]])
  })

  it("repeats continuation keys when content flows to a new page", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "food-1", height: 250, continuationKey: "food" },
        { id: "food-2", height: 250, continuationKey: "food" },
      ],
      300,
    )

    expect(pages).toHaveLength(2)
    expect(pages[1]?.continuationKeys).toContain("food")
  })

  it("returns no pages for empty input", () => {
    expect(packBlocksIntoPages([])).toEqual([])
  })
})
