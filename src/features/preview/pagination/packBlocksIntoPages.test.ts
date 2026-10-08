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

  it("preserves oversized blocks across multiple pages", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 50 },
        { id: "big", height: 500 },
      ],
      300,
    )

    expect(pages.map((page) => page.blockIds)).toEqual([["a"], ["big"], ["big"]])
    expect(pages[1]?.fragments?.big).toEqual({ offset: 0, height: 300 })
    expect(pages[2]?.fragments?.big).toEqual({ offset: 300, height: 200 })
  })

  it("uses remaining space after the final fragment", () => {
    const pages = packBlocksIntoPages(
      [
        { id: "a", height: 50 },
        { id: "big", height: 500 },
        { id: "c", height: 50 },
      ],
      300,
    )

    expect(pages.map((page) => page.blockIds)).toEqual([["a"], ["big"], ["big", "c"]])
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


describe("fragment capacity and content preservation", () => {
  it("splits at row boundaries and covers every pixel exactly once", () => {
    const pages = packBlocksIntoPages([
      { id: "contacts", height: 750, breakOffsets: [100, 200, 350, 450, 600, 700] },
    ], 300)
    expect(pages.map((page) => page.fragments?.contacts)).toEqual([
      { offset: 0, height: 200 },
      { offset: 200, height: 250 },
      { offset: 450, height: 300 },
    ])
  })

  it("splits a block that fits a bare page but exceeds continuation capacity", () => {
    const pages = packBlocksIntoPages([
      { id: "first", height: 900, continuationKey: "food" },
      { id: "next", height: 900, continuationKey: "food", breakOffsets: [400, 800] },
    ], { contentHeightPx: 912, continuationHeadingHeights: { food: 42 } })
    expect(pages[1]?.fragments?.next).toEqual({ offset: 0, height: 800 })
    expect(pages[2]?.fragments?.next).toEqual({ offset: 800, height: 100 })
    expect(pages.slice(1).every((page) => page.continuationKeys.includes("food"))).toBe(true)
  })

  it("terminates without losing content when a heading fills the whole page", () => {
    const pages = packBlocksIntoPages([
      { id: "big", height: 700, continuationKey: "food" },
    ], { contentHeightPx: 300, continuationHeadingHeights: { food: 300 } })
    expect(pages.map((page) => page.fragments?.big)).toEqual([
      { offset: 0, height: 300 }, { offset: 300, height: 300 }, { offset: 600, height: 100 },
    ])
  })

  it("keeps every page within budget across mixed block sizes and breaks", () => {
    const blocks = Array.from({ length: 80 }, (_, index) => ({
      id: `block-${index}`,
      height: 1 + (index * 137) % 1600,
      breakBefore: index % 9 === 0,
      continuationKey: index % 4 === 0 ? undefined : "section",
      breakOffsets: Array.from({ length: 60 }, (_, row) => (row + 1) * 28),
    }))
    const pages = packBlocksIntoPages(blocks, {
      contentHeightPx: 912, continuationHeadingHeights: { section: 58 },
    })
    for (const page of pages) {
      const used = page.blockIds.reduce((sum, id) =>
        sum + (page.fragments?.[id]?.height ?? blocks.find((block) => block.id === id)!.height),
      page.continuationKeys.length * 58)
      expect(used).toBeLessThanOrEqual(912)
    }
    for (const block of blocks) {
      let end = 0
      for (const page of pages.filter((page) => page.blockIds.includes(block.id))) {
        const fragment = page.fragments?.[block.id] ?? { offset: 0, height: block.height }
        expect(fragment.offset).toBe(end)
        end += fragment.height
      }
      expect(end).toBe(block.height)
    }
  })
})
