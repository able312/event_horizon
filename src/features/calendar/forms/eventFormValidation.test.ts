import { describe, expect, it } from "vitest"
import { isCreateEventFormValid } from "./eventFormValidation"

const base = { title: "Gala", startDateTime: null, endDateTime: null }

describe("isCreateEventFormValid", () => {
  it("allows an undated New Lead", () => {
    expect(isCreateEventFormValid({ ...base, status: "new_lead" })).toBe(true)
  })

  it("rejects an undated Tentative event until it has a start date", () => {
    expect(isCreateEventFormValid({ ...base, status: "tentative" })).toBe(false)
    expect(
      isCreateEventFormValid({ ...base, status: "tentative", startDateTime: "2026-10-10T15:00:00.000Z" }),
    ).toBe(true)
  })

  it("still requires a title", () => {
    expect(isCreateEventFormValid({ ...base, title: " ", status: "new_lead" })).toBe(false)
  })
})
