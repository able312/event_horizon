import { describe, expect, it } from "vitest"

import { hasText } from "~/lib/utils"
import { otherTabForKey, showsInternalNotePrompt, toNotePreview } from "./itemNoteTabs"

describe("item note tabs", () => {
  it("treats whitespace-only and missing notes as empty", () => {
    expect(hasText(null)).toBe(false)
    expect(hasText(undefined)).toBe(false)
    expect(hasText("  \n ")).toBe(false)
    expect(hasText("No nuts")).toBe(true)
  })

  it("shows the kitchen note as a prompt only while it is empty and not open", () => {
    expect(showsInternalNotePrompt("", "client")).toBe(true)
    expect(showsInternalNotePrompt("   ", "client")).toBe(true)
    expect(showsInternalNotePrompt("", "internal")).toBe(false)
    expect(showsInternalNotePrompt("Fire at 6:30", "client")).toBe(false)
  })

  it("moves between the two tabs with the arrow, Home and End keys", () => {
    expect(otherTabForKey("ArrowRight", "client")).toBe("internal")
    expect(otherTabForKey("ArrowLeft", "client")).toBe("internal")
    expect(otherTabForKey("ArrowRight", "internal")).toBe("client")
    expect(otherTabForKey("Home", "internal")).toBe("client")
    expect(otherTabForKey("End", "client")).toBe("internal")
    expect(otherTabForKey("Enter", "client")).toBeNull()
  })

  it("flattens a note to one line for the collapsed preview", () => {
    expect(toNotePreview("Lettuce\nTomato\n\nOn the side")).toBe("Lettuce, Tomato | On the side")
    expect(toNotePreview("")).toBe("")
  })
})
