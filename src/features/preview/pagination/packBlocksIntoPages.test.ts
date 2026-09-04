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

  it("places next block on a fresh page after an oversized block", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 50 },
        { id: "big", height: 500 },
        { id: "c", height: 50 },
      ],
      300,
    )

    expect(pages.map((page) => page.blockIds)).toEqual([["a"], ["big"], ["c"]])
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

  it("repeats continuation keys across three pages", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "food-1", height: 200, continuationKey: "food" },
        { id: "food-2", height: 200, continuationKey: "food" },
        { id: "food-3", height: 200, continuationKey: "food" },
      ],
      300,
    )

    expect(pages).toHaveLength(3)
    expect(pages[0]?.continuationKeys).toEqual([])
    expect(pages[1]?.continuationKeys).toEqual(["food"])
    expect(pages[2]?.continuationKeys).toEqual(["food"])
  })

  it("clears active continuation key after a block without a key", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "bev-1", height: 250, continuationKey: "beverage" },
        { id: "setup-1", height: 250 },
      ],
      300,
    )

    expect(pages).toHaveLength(2)
    expect(pages[1]?.continuationKeys).toEqual([])
  })

  it("subtracts continuation heading height from page capacity", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "food-1", height: 200, continuationKey: "food" },
        { id: "food-2", height: 80, continuationKey: "food" },
        { id: "food-3", height: 80, continuationKey: "food" },
      ],
      {
        contentHeightPx: 300,
        continuationHeadingHeights: { food: 50 },
      },
    )

    // Page 1: food-1 (200). Remaining 100.
    // food-2 (80) fits. Remaining 20.
    // food-3 (80) does not fit → new page with heading (50) + food-3 (80) = 130 <= 300.
    expect(pages).toHaveLength(2)
    expect(pages[0]?.blockIds).toEqual(["food-1", "food-2"])
    expect(pages[1]?.blockIds).toEqual(["food-3"])
    expect(pages[1]?.continuationKeys).toEqual(["food"])
  })

  it("continuation heading height can force an earlier page break", () => {
    // Without heading budget: page 2 would hold food-2 + food-3 (240 <= 300).
    // With heading 100: available on page 2 is 200, so food-3 spills to page 3.
    const pages = packBlocksIntoPages(
      [
        { id: "food-1", height: 250, continuationKey: "food" },
        { id: "food-2", height: 120, continuationKey: "food" },
        { id: "food-3", height: 120, continuationKey: "food" },
      ],
      {
        contentHeightPx: 300,
        continuationHeadingHeights: { food: 100 },
      },
    )

    expect(pages.map((page) => page.blockIds)).toEqual([
      ["food-1"],
      ["food-2"],
      ["food-3"],
    ])
    expect(pages[1]?.continuationKeys).toEqual(["food"])
    expect(pages[2]?.continuationKeys).toEqual(["food"])
  })

  it("returns no pages for empty input", () => {
    expect(packBlocksIntoPages([])).toEqual([])
  })
})
