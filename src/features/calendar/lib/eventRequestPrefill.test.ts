import { describe, expect, it } from "vitest"
import type { EventRequest } from "~/definitions/database"
import { eventRequestToPrefill, formatRequestDate, formatRequestTime, requestClientName } from "./eventRequestPrefill"

function request(overrides: Partial<EventRequest> = {}): EventRequest {
  return {
    id: "req-1", responseId: "resp-1", submittedAt: "2026-10-16T15:00:00.000Z", receivedAt: "2026-10-16T15:00:01.000Z",
    firstName: "Jane", lastName: "Smith", organizationName: null, email: "jane@example.test", phone: "555-0100",
    eventType: "wedding", preferredDate: "2027-06-20", alternateDate: null, startTime: "18:30",
    guestCount: 120, details: "Outdoor ceremony", referralSource: null, extraAnswers: [],
    status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
    ...overrides,
  }
}

describe("eventRequestToPrefill", () => {
  it("maps the request to a New Lead on the preferred day at the requested local time", () => {
    const { values } = eventRequestToPrefill(request())
    const start = new Date(values.startDateTime!)
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([2027, 5, 20, 18, 30])
    expect(values).toMatchObject({
      title: "Smith Wedding", type: "wedding", status: "new_lead", endDateTime: values.startDateTime, minGuests: 0, maxGuests: 120,
    })
  })

  it("starts at local midnight without a time and leaves the dates empty without a preferred date", () => {
    const midnight = new Date(eventRequestToPrefill(request({ startTime: null })).values.startDateTime!)
    expect([midnight.getDate(), midnight.getHours(), midnight.getMinutes()]).toEqual([20, 0, 0])

    const undated = eventRequestToPrefill(request({ preferredDate: null })).values
    expect(undated.startDateTime).toBeNull()
    expect(undated.endDateTime).toBeNull()
  })

  it("titles the event after the organization when there is one", () => {
    expect(eventRequestToPrefill(request({ organizationName: "Acme Corp", eventType: "tournament" })).values.title).toBe("Acme Corp Tournament")
  })

  it("pre-fills a new client contact, searching by email when staff go back to search", () => {
    expect(eventRequestToPrefill(request()).client).toEqual({
      mode: "create", query: "jane@example.test", values: { name: "Jane Smith", email: "jane@example.test", phone: "555-0100" },
    })
  })

  it("keeps the client's description as client notes and every other answer in internal notes", () => {
    const { notes } = eventRequestToPrefill(request({
      organizationName: "Acme Corp", alternateDate: "2027-06-27", referralSource: "Instagram / Facebook",
      extraAnswers: [{ question: "Dietary needs", answer: "Vegan" }],
    }))
    expect(notes.clientNotes).toBe("Outdoor ceremony")
    expect(notes.internalNotes).toBe([
      "Website request submitted Oct 16, 2026",
      "Organization: Acme Corp",
      "Requested start time: 6:30 PM",
      "Alternate date: Jun 27, 2027",
      "Heard about us: Instagram / Facebook",
      "Dietary needs: Vegan",
    ].join("\n"))
  })

  it("leaves out answers the client skipped", () => {
    const { notes } = eventRequestToPrefill(request({ details: null, startTime: null }))
    expect(notes.clientNotes).toBeNull()
    expect(notes.internalNotes).toBe("Website request submitted Oct 16, 2026")
  })
})

describe("request display helpers", () => {
  it("formats yyyy-MM-dd as the same calendar day in any time zone", () => {
    expect(formatRequestDate("2027-01-01")).toBe("Jan 1, 2027")
    expect(formatRequestDate("not a date")).toBe("not a date")
  })

  it("formats HH:mm in 12-hour time", () => {
    expect(formatRequestTime("09:05")).toBe("9:05 AM")
    expect(formatRequestTime("00:00")).toBe("12:00 AM")
  })

  it("joins the client's name", () => {
    expect(requestClientName({ firstName: "Jane", lastName: "Smith" })).toBe("Jane Smith")
  })
})
