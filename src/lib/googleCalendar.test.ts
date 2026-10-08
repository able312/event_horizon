import { describe, expect, it } from "vitest"
import {
  buildGoogleCalendarCreateUrl,
  buildGoogleCalendarUpdateUrl,
  type GoogleCalendarEventInput,
} from "./googleCalendar"

function makeEvent(overrides: Partial<GoogleCalendarEventInput> = {}): GoogleCalendarEventInput {
  return {
    title: "Example Dinner",
    type: "function",
    status: "confirmed",
    startDateTime: "2026-05-12T18:30:00.000Z",
    endDateTime: "2026-05-12T21:00:00.000Z",
    minGuests: 80,
    maxGuests: 120,
    guestCountFinal: 0,
    calendarId: "abc123",
    internalNotes: "Sample note for testing.",
    ...overrides,
  }
}

describe("googleCalendar utils", () => {
  it("formats UTC dates for Google params", () => {
    const url = new URL(buildGoogleCalendarCreateUrl(makeEvent({ startDateTime: "2026-05-12T18:30:45.000Z" })))
    expect(url.searchParams.get("dates")).toBe("20260512T183045Z/20260512T210000Z")
  })

  it("builds description and omits empty internal note", () => {
    const description = new URL(buildGoogleCalendarCreateUrl(
      makeEvent({
        internalNotes: "   ",
        guestCountFinal: 1,
        maxGuests: 99,
      }),
    )).searchParams.get("details")

    expect(description).not.toContain("internal")
    expect(description).toContain("GUESTS: 99 guests (final)")
    expect(description).toContain("Name: Not set")
    expect(description).toContain("EVENT TYPE:")
    expect(description).toContain("STATUS:")
  })

  it("lists the primary client's details under CLIENT INFO", () => {
    const description = new URL(buildGoogleCalendarCreateUrl(makeEvent(), {
      client: { displayName: "Example Name", email: "example.email@nocompany.com", phone: null },
    })).searchParams.get("details")

    expect(description).toContain("Name: Example Name")
    expect(description).toContain("Email: example.email@nocompany.com")
    expect(description).toContain("Phone: Not set")
  })

  it("appends incomplete touchpoints to the description", () => {
    const description = new URL(buildGoogleCalendarCreateUrl(makeEvent(), {
      incompleteTouchpoints: [
        { title: "Final guest count", dueDate: "2026-07-20T00:00:00.000Z" },
      ],
    })).searchParams.get("details")

    expect(description).toContain("TOUCHPOINTS")
    expect(description).toContain("Final guest count")
  })

  it("builds create and update URLs with required params", () => {
    const event = makeEvent()

    const createUrl = new URL(buildGoogleCalendarCreateUrl(event))
    expect(createUrl.pathname).toBe("/calendar/u/0/r/eventedit")
    expect(createUrl.searchParams.get("text")).toBe(event.title)
    expect(createUrl.searchParams.get("dates")).toBe("20260512T183000Z/20260512T210000Z")
    expect(createUrl.searchParams.get("details")).toContain("CLIENT INFO")

    const updateUrl = new URL(buildGoogleCalendarUpdateUrl(event))
    expect(updateUrl.pathname).toContain("/calendar/u/0/r/eventedit/")
    expect(updateUrl.pathname.endsWith("/abc123")).toBe(true)
    expect(updateUrl.searchParams.get("text")).toBe(event.title)
  })

  it("throws when start or end datetime is missing", () => {
    expect(() => buildGoogleCalendarCreateUrl(makeEvent({ startDateTime: null }))).toThrow(
      "Event startDateTime and endDateTime are required",
    )
    expect(() => buildGoogleCalendarCreateUrl(makeEvent({ endDateTime: null }))).toThrow(
      "Event startDateTime and endDateTime are required",
    )
  })

  it("throws when update url is requested without a calendar id", () => {
    expect(() => buildGoogleCalendarUpdateUrl(makeEvent({ calendarId: "   " }))).toThrow(
      "calendarId is required for update URL",
    )
  })
})
