import { describe, expect, it } from "vitest"

import { effectiveUserName, normalizeUserName, USER_NAME_MAX_LENGTH, validatePreferredName } from "./userName"

describe("normalizeUserName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeUserName("  Sam   Staff ")).toBe("Sam Staff")
  })

  it("treats blank input as no name", () => {
    expect(normalizeUserName("   ")).toBeNull()
  })
})

describe("validatePreferredName", () => {
  it("keeps a name that differs from the Google name", () => {
    expect(validatePreferredName(" Sammy ", "Sam Staff")).toEqual({ ok: true, preferredName: "Sammy" })
  })

  it("clears the preferred name when blank or null", () => {
    expect(validatePreferredName("  ", "Sam Staff")).toEqual({ ok: true, preferredName: null })
    expect(validatePreferredName(null, "Sam Staff")).toEqual({ ok: true, preferredName: null })
  })

  it("clears the preferred name when it matches the Google name", () => {
    expect(validatePreferredName("Sam  Staff", "Sam Staff")).toEqual({ ok: true, preferredName: null })
  })

  it("rejects names over the length limit", () => {
    const result = validatePreferredName("a".repeat(USER_NAME_MAX_LENGTH + 1), null)
    expect(result.ok).toBe(false)
  })

  it("accepts a name exactly at the limit", () => {
    const name = "a".repeat(USER_NAME_MAX_LENGTH)
    expect(validatePreferredName(name, null)).toEqual({ ok: true, preferredName: name })
  })
})

describe("effectiveUserName", () => {
  it("prefers the user's own name", () => {
    expect(effectiveUserName({ name: "Sam Staff", preferredName: "Sammy" })).toBe("Sammy")
  })

  it("falls back to the Google name, then null", () => {
    expect(effectiveUserName({ name: "Sam Staff" })).toBe("Sam Staff")
    expect(effectiveUserName({ name: "Sam Staff", preferredName: null })).toBe("Sam Staff")
    expect(effectiveUserName({ name: null })).toBeNull()
  })
})
