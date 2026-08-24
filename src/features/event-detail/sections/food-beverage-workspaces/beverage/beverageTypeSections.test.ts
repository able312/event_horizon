import { describe, expect, it } from "vitest"
import type { BeverageItemType } from "~/definitions/database"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"
import { formatBeverageItemLine, getVisibleBeverageTypeSections } from "./beverageTypeSections"

function item(type: BeverageItemType, name: string) {
  return { type, name }
}

describe("getVisibleBeverageTypeSections", () => {
  it("groups items in beverage-type order and keeps empty non-special-order sections", () => {
    const sections = getVisibleBeverageTypeSections([
      item("Wine", "House Red"),
      item("Beer", "Lager"),
      item("Wine", "House White"),
    ])

    expect(sections.map((section) => section.type)).toEqual(
      ITER_BEVERAGE_TYPE.filter((type) => type !== "Special Orders"),
    )
    expect(sections.find((section) => section.type === "Beer")?.items.map((entry) => entry.name)).toEqual(["Lager"])
    expect(sections.find((section) => section.type === "Wine")?.items.map((entry) => entry.name)).toEqual([
      "House Red",
      "House White",
    ])
    expect(sections.find((section) => section.type === "Rails")?.items).toEqual([])
  })

  it("hides empty Special Orders by default and keeps them when asked", () => {
    expect(
      getVisibleBeverageTypeSections([item("Beer", "Lager")]).some((section) => section.type === "Special Orders"),
    ).toBe(false)

    const withEmptySpecialOrders = getVisibleBeverageTypeSections([item("Beer", "Lager")], {
      hideEmptySpecialOrders: false,
    })
    expect(withEmptySpecialOrders.some((section) => section.type === "Special Orders")).toBe(true)

    const withSpecialOrder = getVisibleBeverageTypeSections([item("Special Orders", "House bottle")])
    expect(withSpecialOrder.find((section) => section.type === "Special Orders")?.items).toEqual([
      item("Special Orders", "House bottle"),
    ])
  })
})

describe("formatBeverageItemLine", () => {
  it("formats quantity and falls back to Untitled item", () => {
    expect(formatBeverageItemLine({ quantity: 12, name: "House Red" })).toBe("12 × House Red")
    expect(formatBeverageItemLine({ quantity: 0, name: "House Red" })).toBe("House Red")
    expect(formatBeverageItemLine({ quantity: null, name: "" })).toBe("Untitled item")
  })
})
