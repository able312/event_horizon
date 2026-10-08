import { describe, expect, it } from "vitest"
import { countItemsThatFit } from "./dayEventFit"

describe("countItemsThatFit", () => {
  it("counts items whose bottom edge is inside the container", () => {
    expect(countItemsThatFit(200, [90, 186, 280])).toBe(2)
  })

  it("returns every item when all fit", () => {
    expect(countItemsThatFit(300, [90, 186, 280])).toBe(3)
  })

  it("keeps at least one item visible when even the first overflows", () => {
    expect(countItemsThatFit(60, [90, 186])).toBe(1)
  })

  it("shows all items when the container has not been measured", () => {
    expect(countItemsThatFit(0, [0, 0, 0])).toBe(3)
  })

  it("returns 0 when there are no items", () => {
    expect(countItemsThatFit(200, [])).toBe(0)
  })
})
