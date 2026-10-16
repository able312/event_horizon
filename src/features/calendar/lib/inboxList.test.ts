import { describe, expect, it } from "vitest"

import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventRequest } from "~/definitions/database"

import { filterInboxLeads, filterInboxRequests, formatReceivedAt } from "./inboxList"

function request(overrides: Partial<EventRequest>): EventRequest {
  return {
    id: "req-1", responseId: "resp-1", submittedAt: "2026-10-16T15:00:00.000Z", receivedAt: "2026-10-16T15:00:01.000Z",
    eventName: null, firstName: "Jane", lastName: "Smith", organizationName: null, email: "jane@example.test", phone: "555-0100",
    eventType: "wedding", preferredDate: null, alternateDate: null, startTime: null,
    guestCount: 120, details: null, referralSource: null, extraAnswers: [],
    status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
    ...overrides,
  }
}

describe("filterInboxRequests", () => {
  const birthday = request({ id: "a", eventName: "Sarah's 40th", firstName: "Sarah", lastName: "Lee", eventType: "function" })
  const golf = request({ id: "b", organizationName: "Acme Corp", eventType: "tournament", details: "Shotgun start" })
  const requests = [birthday, golf]

  it("returns everything for a blank search", () => {
    expect(filterInboxRequests(requests, "  ")).toEqual(requests)
  })

  it("matches the title, client, organization, type and description, ignoring case", () => {
    expect(filterInboxRequests(requests, "40TH")).toEqual([birthday])
    expect(filterInboxRequests(requests, "sarah lee")).toEqual([birthday])
    expect(filterInboxRequests(requests, "acme")).toEqual([golf])
    expect(filterInboxRequests(requests, "tournament")).toEqual([golf])
    expect(filterInboxRequests(requests, "shotgun")).toEqual([golf])
  })

  it("needs every word to match", () => {
    expect(filterInboxRequests(requests, "sarah acme")).toEqual([])
  })
})

describe("filterInboxLeads", () => {
  const lead = (id: string, title: string) => ({ id, title, type: "wedding" }) as Event
  const leads = [lead("e-1", "Patel Wedding"), lead("e-2", "Board dinner")]
  const clients: Record<string, PrimaryClient> = {
    "e-2": { contactId: "c-1", displayName: "Morgan Reyes", email: "morgan@example.test", phone: null },
  }

  it("matches the lead's title or its primary client", () => {
    expect(filterInboxLeads(leads, clients, "patel")).toEqual([leads[0]])
    expect(filterInboxLeads(leads, clients, "morgan")).toEqual([leads[1]])
    expect(filterInboxLeads(leads, undefined, "")).toEqual(leads)
  })
})

describe("formatReceivedAt", () => {
  const now = new Date(2026, 9, 16, 17, 0)

  it("shows the time for today, Yesterday, then the date", () => {
    expect(formatReceivedAt(new Date(2026, 9, 16, 14, 5).toISOString(), now)).toBe("2:05 PM")
    expect(formatReceivedAt(new Date(2026, 9, 15, 23, 59).toISOString(), now)).toBe("Yesterday")
    expect(formatReceivedAt(new Date(2026, 9, 3, 9, 0).toISOString(), now)).toBe("Oct 3")
    expect(formatReceivedAt(new Date(2025, 9, 3, 9, 0).toISOString(), now)).toBe("Oct 3, 2025")
  })

  it("is blank for a bad timestamp", () => {
    expect(formatReceivedAt("not a date", now)).toBe("")
  })
})
