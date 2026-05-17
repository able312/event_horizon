import { describe, expect, it } from "vitest"

import { parseHotkeyCombo } from "~/lib/hotKeys"

describe("parseHotkeyCombo", () => {
  it("parses cmd+f and keeps modifier intent", () => {
    const parsed = parseHotkeyCombo("Cmd+f")

    expect(parsed).toEqual({
      wantsMeta: true,
      wantsCtrl: false,
      wantsShift: false,
      wantsAlt: false,
      key: "f",
    })
  })

  it("maps space token to keyboard event space key", () => {
    const parsed = parseHotkeyCombo("space")
    expect(parsed.key).toBe(" ")
  })

  it("rejects legacy space shorthand", () => {
    expect(() => parseHotkeyCombo(" ")).toThrow(/use "space" for space bar/i)
  })

  it("rejects empty combos", () => {
    expect(() => parseHotkeyCombo("")).toThrow(/combo cannot be empty/i)
  })

  it("rejects empty tokens like cmd++f", () => {
    expect(() => parseHotkeyCombo("cmd++f")).toThrow(/empty token detected/i)
  })

  it("rejects combos with multiple non-modifier keys", () => {
    expect(() => parseHotkeyCombo("a+b")).toThrow(
      /exactly one non-modifier key is required/i,
    )
  })
})
