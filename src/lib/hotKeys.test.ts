import { describe, expect, it } from "vitest"

import { matchesHotkey, parseHotkeyCombo } from "~/lib/hotKeys"

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

describe("matchesHotkey", () => {
  const key = (init: Partial<Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">>) => ({
    key: "f", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init,
  })

  it("matches Cmd with ⌘ on macOS", () => {
    const parsed = parseHotkeyCombo("Cmd+f")
    expect(matchesHotkey(parsed, key({ metaKey: true }), true)).toBe(true)
    expect(matchesHotkey(parsed, key({ ctrlKey: true }), true)).toBe(false)
  })

  it("matches Cmd with Ctrl, not the Windows key, elsewhere", () => {
    const parsed = parseHotkeyCombo("Cmd+f")
    expect(matchesHotkey(parsed, key({ ctrlKey: true }), false)).toBe(true)
    expect(matchesHotkey(parsed, key({ metaKey: true }), false)).toBe(false)
  })

  it("requires every requested modifier and the key", () => {
    const parsed = parseHotkeyCombo("Cmd+Shift+c")
    expect(matchesHotkey(parsed, key({ key: "C", ctrlKey: true, shiftKey: true }), false)).toBe(true)
    expect(matchesHotkey(parsed, key({ key: "c", ctrlKey: true }), false)).toBe(false)
    expect(matchesHotkey(parsed, key({ key: "x", ctrlKey: true, shiftKey: true }), false)).toBe(false)
  })

  it("matches the space key", () => {
    expect(matchesHotkey(parseHotkeyCombo("space"), key({ key: " " }), false)).toBe(true)
  })
})
