import { describe, expect, it } from "vitest"

import {
  buildConversionImpact,
  getDestinationOptions,
} from "./timeblock-conversion"

describe("timeblock-conversion", () => {
  it("builds a non-destructive impact when leaving food with no items", () => {
    const impact = buildConversionImpact({
      timeblockId: "tb-1",
      title: "Dinner",
      fromType: "food",
      toType: "note",
      foodItemCount: 0,
    })

    expect(impact.isDestructive).toBe(false)
    expect(impact.requiresConfirmation).toBe(false)
    expect(impact.deletedItemCount).toBe(0)
  })

  it("builds a destructive impact with clear loss copy when food items exist", () => {
    const impact = buildConversionImpact({
      timeblockId: "tb-1",
      title: "Dinner",
      fromType: "food",
      toType: "note",
      foodItemCount: 4,
    })

    expect(impact.isDestructive).toBe(true)
    expect(impact.requiresConfirmation).toBe(true)
    expect(impact.deletedItemCount).toBe(4)
    expect(impact.summary).toContain("Converting Dinner to a Note will permanently delete 4 food items")
    expect(impact.lostFields).toEqual([
      "food_items",
      "quantities",
      "prices",
      "service_styles",
      "item_notes",
    ])
  })

  it("excludes the current type from destination options", () => {
    expect(getDestinationOptions("note")).toEqual(["setup_instruction", "food"])
    expect(getDestinationOptions("food")).toEqual(["note", "setup_instruction"])
  })
})
