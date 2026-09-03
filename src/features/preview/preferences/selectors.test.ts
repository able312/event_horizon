import { describe, expect, it } from "vitest"

import {
  filterSelectedIds,
  formatPreviewPrice,
  formatPreviewQuantity,
  hasContactInfo,
  hasBeverageSectionContent,
  isBillableLineItem,
  toTimeblockOptions,
} from "./selectors"

describe("preview preference selectors", () => {
  it("treats any populated contact field as available", () => {
    expect(hasContactInfo({ clientName: null, clientPhone: "555", clientEmail: null })).toBe(true)
    expect(hasContactInfo({ clientName: "", clientPhone: "", clientEmail: "" })).toBe(false)
  })

  it("treats beverage section as available with items or timeblocks", () => {
    expect(hasBeverageSectionContent({ timeblocks: [], items: [] })).toBe(false)
    expect(hasBeverageSectionContent({ timeblocks: [{ id: "t1" }], items: [] })).toBe(true)
    expect(
      hasBeverageSectionContent({
        timeblocks: [],
        items: [
          {
            id: "b1",
            eventId: "e1",
            name: "Beer",
            quantity: null,
            type: "Beer",
            serviceStyle: null,
            includes: null,
            unitPriceCents: null,
            assignedTimeblockIds: [],
          },
        ],
      }),
    ).toBe(true)
  })

  it("filters stale selected ids", () => {
    expect(filterSelectedIds(["a", "b", "c"], ["a", "c"])).toEqual(["a", "c"])
  })

  it("adds time to duplicate titles", () => {
    const options = toTimeblockOptions([
      { id: "1", title: "Lunch", time: "12:00" },
      { id: "2", title: "Lunch", time: "13:00" },
      { id: "3", title: "Dinner", time: "18:00" },
    ])

    expect(options[0]?.label).toContain("12:00")
    expect(options[1]?.label).toContain("13:00")
    expect(options[2]?.label).toContain("Dinner")
  })

  it("formats blank missing quantities and prices", () => {
    expect(formatPreviewQuantity(null)).toBe("")
    expect(formatPreviewQuantity(0)).toBe("")
    expect(formatPreviewQuantity(4)).toBe("4")
    expect(formatPreviewPrice(null, (c) => `$${c}`)).toBe("")
    expect(formatPreviewPrice(0, (c) => `$${c}`)).toBe("")
    expect(formatPreviewPrice(500, (c) => `$${c}`)).toBe("$500")
  })

  it("requires both quantity and price for billable charge rows", () => {
    expect(isBillableLineItem({ quantity: 2, unitPriceCents: 100 })).toBe(true)
    expect(isBillableLineItem({ quantity: 0, unitPriceCents: 100 })).toBe(false)
    expect(isBillableLineItem({ quantity: 2, unitPriceCents: null })).toBe(false)
  })
})
