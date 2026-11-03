import { describe, expect, it } from "vitest"

import { hasNoteText, showsInternalNotePrompt, toNotePreview } from "./itemNoteTabs"

describe("item note tabs", () => {
  it("treats whitespace-only and missing notes as empty", () => {
    expect(hasNoteText(null)).toBe(false)
    expect(hasNoteText(undefined)).toBe(false)
    expect(hasNoteText("  \n ")).toBe(false)
    expect(hasNoteText("No nuts")).toBe(true)
  })

  it("shows the kitchen note as a prompt only while it is empty and not open", () => {
    expect(showsInternalNotePrompt("", "client")).toBe(true)
    expect(showsInternalNotePrompt("   ", "client")).toBe(true)
    expect(showsInternalNotePrompt("", "internal")).toBe(false)
    expect(showsInternalNotePrompt("Fire at 6:30", "client")).toBe(false)
  })

  it("flattens a note to one line for the collapsed preview", () => {
    expect(toNotePreview("Lettuce\nTomato\n\nOn the side")).toBe("Lettuce, Tomato | On the side")
    expect(toNotePreview("")).toBe("")
  })
})
