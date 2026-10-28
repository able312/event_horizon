import { describe, expect, it } from "vitest"
import { dateRemovalEffects } from "./eventDateRemoval"

const DATE = "2026-07-14T15:00:00.000Z"
const LINK = "abc123def@google.com"

describe("dateRemovalEffects", () => {
  it("moves a status that needs a date back to New Lead", () => {
    expect(dateRemovalEffects({ status: "tentative", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: null }))
      .toEqual({ movesToNewLead: true, removesFromGoogleCalendar: false })
    expect(dateRemovalEffects({ status: "closed", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: null }))
      .toEqual({ movesToNewLead: true, removesFromGoogleCalendar: false })
  })

  it("removes a linked event from Google Calendar, whatever its status", () => {
    expect(dateRemovalEffects({ status: "new_lead", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: LINK }))
      .toEqual({ movesToNewLead: false, removesFromGoogleCalendar: true })
    expect(dateRemovalEffects({ status: "confirmed", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: LINK }))
      .toEqual({ movesToNewLead: true, removesFromGoogleCalendar: true })
  })

  it("has nothing to confirm for unlinked New Lead and Lost events", () => {
    expect(dateRemovalEffects({ status: "new_lead", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: null })).toBeNull()
    expect(dateRemovalEffects({ status: "lost", currentStartDateTime: DATE, nextStartDateTime: null, calendarId: " " })).toBeNull()
  })

  it("ignores saves that keep or change the date", () => {
    expect(dateRemovalEffects({ status: "confirmed", currentStartDateTime: DATE, nextStartDateTime: DATE, calendarId: LINK })).toBeNull()
    expect(dateRemovalEffects({ status: "confirmed", currentStartDateTime: DATE, nextStartDateTime: "2026-08-01T15:00:00.000Z", calendarId: LINK })).toBeNull()
    expect(dateRemovalEffects({ status: "new_lead", currentStartDateTime: null, nextStartDateTime: null, calendarId: LINK })).toBeNull()
  })
})
