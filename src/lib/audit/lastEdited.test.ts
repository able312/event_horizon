import { describe, expect, it } from "vitest"

import { describeLastEdit, formatLastEdit, parseRecordTimestamp, userDisplayName } from "./lastEdited"

const users = [
  { id: "u1", name: "Sam Staff", email: "sam@westlinks.ca" },
  { id: "u2", name: null, email: "noname@westlinks.ca" },
  { id: "u3", name: "  ", email: "blank@westlinks.ca" },
]

describe("parseRecordTimestamp", () => {
  it("reads both stored timestamp formats", () => {
    expect(parseRecordTimestamp("1790812800000")?.toISOString()).toBe("2026-10-01T00:00:00.000Z")
    expect(parseRecordTimestamp("2026-10-01T00:00:00.000Z")?.getTime()).toBe(1790812800000)
  })

  it("returns null for missing or unparseable values", () => {
    expect(parseRecordTimestamp(null)).toBeNull()
    expect(parseRecordTimestamp(undefined)).toBeNull()
    expect(parseRecordTimestamp("")).toBeNull()
    expect(parseRecordTimestamp("not a date")).toBeNull()
  })
})

describe("userDisplayName", () => {
  it("prefers the name, falls back to email, and handles unknown users", () => {
    expect(userDisplayName("u1", users)).toBe("Sam Staff")
    expect(userDisplayName("u2", users)).toBe("noname@westlinks.ca")
    expect(userDisplayName("u3", users)).toBe("blank@westlinks.ca")
    expect(userDisplayName("missing", users)).toBe("Unknown user")
  })
})

describe("describeLastEdit", () => {
  it("is null when the editor is unknown", () => {
    expect(describeLastEdit({ updatedAt: "1790812800000" }, users)).toBeNull()
  })

  it("names the editor and uses updatedAt, falling back to createdAt", () => {
    expect(describeLastEdit({ updatedBy: "u1", updatedAt: "1790812800000", createdAt: "1" }, users))
      .toEqual({ editor: "Sam Staff", at: new Date(1790812800000) })
    expect(describeLastEdit({ updatedBy: "u1", updatedAt: null, createdAt: "2026-10-01T00:00:00.000Z" }, users))
      .toEqual({ editor: "Sam Staff", at: new Date(1790812800000) })
    expect(describeLastEdit({ updatedBy: "u2", updatedAt: null }, users)).toEqual({ editor: "noname@westlinks.ca", at: null })
  })
})

describe("formatLastEdit", () => {
  it("includes the time only when known", () => {
    expect(formatLastEdit({ editor: "Sam Staff", at: null })).toBe("Last edited by Sam Staff")
    expect(formatLastEdit({ editor: "Sam Staff", at: new Date(1790812800000) })).toMatch(/^Last edited by Sam Staff · .*2026/)
  })
})
