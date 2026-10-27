import { describe, expect, it } from "vitest"
import { buildGoogleCalendarEventBody, type GoogleCalendarEventInput } from "./googleCalendar"

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
    internalNotes: "Sample note for testing.",
    ...overrides,
  }
}

describe("buildGoogleCalendarEventBody", () => {
  it("sends the title and UTC start and end times", () => {
    const body = buildGoogleCalendarEventBody(makeEvent({ startDateTime: "2026-05-12T14:30:45-04:00" }))
    expect(body.summary).toBe("Example Dinner")
    expect(body.start).toEqual({ dateTime: "2026-05-12T18:30:45.000Z" })
    expect(body.end).toEqual({ dateTime: "2026-05-12T21:00:00.000Z" })
  })

  it("falls back to a placeholder title", () => {
    expect(buildGoogleCalendarEventBody(makeEvent({ title: "  " })).summary).toBe("Untitled Event")
  })

  it("builds description and omits empty internal note", () => {
    const { description } = buildGoogleCalendarEventBody(
      makeEvent({ internalNotes: "   ", guestCountFinal: 1, maxGuests: 99 }),
    )

    expect(description).not.toContain("Sample note")
    expect(description).toContain("GUESTS: 99 guests (final)")
    expect(description).toContain("Name: Not set")
    expect(description).toContain("EVENT TYPE: Function")
    expect(description).toContain("STATUS: Confirmed")
  })

  it("lists the primary client's details under CLIENT INFO", () => {
    const { description } = buildGoogleCalendarEventBody(makeEvent(), {
      client: { displayName: "Example Name", email: "example.email@nocompany.com", phone: null },
    })

    expect(description).toContain("Name: Example Name")
    expect(description).toContain("Email: example.email@nocompany.com")
    expect(description).toContain("Phone: Not set")
  })

  it("appends incomplete touchpoints to the description", () => {
    const { description } = buildGoogleCalendarEventBody(makeEvent(), {
      incompleteTouchpoints: [{ title: "Final guest count", dueDate: "2026-07-20T00:00:00.000Z" }],
    })

    expect(description).toContain("TOUCHPOINTS")
    expect(description).toContain("Final guest count")
  })

  it("throws when start or end datetime is missing or invalid", () => {
    expect(() => buildGoogleCalendarEventBody(makeEvent({ startDateTime: null }))).toThrow(
      "Event startDateTime and endDateTime are required",
    )
    expect(() => buildGoogleCalendarEventBody(makeEvent({ endDateTime: null }))).toThrow(
      "Event startDateTime and endDateTime are required",
    )
    expect(() => buildGoogleCalendarEventBody(makeEvent({ endDateTime: "soon" }))).toThrow("Invalid date value: soon")
  })
})
