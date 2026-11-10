import { describe, expect, it } from "vitest"

import type { CurrentUser } from "~/definitions/database"

import { evaluateNameDraft, initialNameDraft } from "./profileName"

const user: CurrentUser = {
  id: "user-1",
  workosUserId: "user_test",
  email: "sam@westlinks.ca",
  name: "Sam Staff",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("initialNameDraft", () => {
  it("starts from the user's own name, else their Google name", () => {
    expect(initialNameDraft({ ...user, preferredName: "Sammy" })).toBe("Sammy")
    expect(initialNameDraft(user)).toBe("Sam Staff")
    expect(initialNameDraft({ ...user, name: null })).toBe("")
  })
})

describe("evaluateNameDraft", () => {
  it("is unchanged when the draft still shows the current name", () => {
    expect(evaluateNameDraft("Sam Staff ", user)).toEqual({ ok: true, preferredName: null, changed: false })
    expect(evaluateNameDraft("Sammy", { ...user, preferredName: "Sammy" }).changed).toBe(false)
  })

  it("is changed when the draft sets a new name", () => {
    expect(evaluateNameDraft("Sammy", user)).toEqual({ ok: true, preferredName: "Sammy", changed: true })
  })

  it("is changed when clearing back to the Google name", () => {
    expect(evaluateNameDraft("", { ...user, preferredName: "Sammy" })).toEqual({ ok: true, preferredName: null, changed: true })
  })

  it("reports validation errors", () => {
    expect(evaluateNameDraft("a".repeat(200), user).ok).toBe(false)
  })
})
