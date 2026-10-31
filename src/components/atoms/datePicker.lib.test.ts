import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { parseTypedDate } from "./datePicker.lib"

describe("parseTypedDate", () => {
  let originalTz: string | undefined

  beforeEach(() => {
    originalTz = process.env.TZ
    // West of UTC, where `new Date("YYYY-MM-DD")` lands on the previous local day
    process.env.TZ = "America/Toronto"
  })

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it("reads ISO date-only text as the local calendar date", () => {
    const parsed = parseTypedDate("2026-03-09")

    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(2)
    expect(parsed?.getDate()).toBe(9)
    expect(parsed?.getHours()).toBe(0)
  })

  it("ignores surrounding whitespace", () => {
    expect(parseTypedDate("  2026-03-09 ")).toEqual(new Date(2026, 2, 9))
  })

  it("rejects ISO text for a day that doesn't exist", () => {
    expect(parseTypedDate("2026-02-30")).toBeNull()
  })

  it("still parses the picker's own display format", () => {
    expect(parseTypedDate("March 09, 2026")).toEqual(new Date(2026, 2, 9))
  })

  it("returns null for text that isn't a date", () => {
    expect(parseTypedDate("next tuesday")).toBeNull()
  })
})
