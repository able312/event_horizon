import { describe, expect, it } from "vitest"

import { changeRows, notificationAttribution, notificationSummary } from "./eventNotificationText"

// Local times, so the day shown doesn't depend on the test machine's zone
const june12 = new Date(2027, 5, 12, 18, 0).toISOString()
const june12Late = new Date(2027, 5, 12, 23, 0).toISOString()
const june13 = new Date(2027, 5, 13, 18, 0).toISOString()

describe("notificationSummary", () => {
  it("summarises a new or deleted event by its date, type and status", () => {
    const changes = [
      { field: "title" as const, from: null, to: "Gala" },
      { field: "startDateTime" as const, from: null, to: june12 },
      { field: "type" as const, from: null, to: "wedding" },
      { field: "status" as const, from: null, to: "tentative" },
    ]
    expect(notificationSummary({ kind: "created", changes })).toBe("Sat, Jun 12, 2027 · Wedding · Tentative")
    expect(notificationSummary({ kind: "deleted", changes: changes.filter((c) => c.field !== "startDateTime") })).toBe("No date yet · Wedding · Tentative")
  })

  it("describes an update's changes, folding a moved event's end into its start", () => {
    expect(notificationSummary({
      kind: "updated",
      changes: [
        { field: "startDateTime", from: june12, to: june13 },
        { field: "endDateTime", from: june12Late, to: june13 },
        { field: "status", from: "tentative", to: "confirmed" },
      ],
    })).toBe("Moved to Sun, Jun 13, 2027 · Status → Confirmed")
  })

  it("names renames, time-only changes, removed dates and overflow", () => {
    expect(notificationSummary({ kind: "updated", changes: [{ field: "startDateTime", from: june12, to: june12Late }] })).toBe("Start time changed")
    expect(notificationSummary({ kind: "updated", changes: [{ field: "endDateTime", from: june12Late, to: june13 }] })).toBe("End time changed")
    expect(notificationSummary({ kind: "updated", changes: [{ field: "startDateTime", from: june12, to: null }, { field: "endDateTime", from: june12Late, to: null }] })).toBe("Date removed")
    expect(notificationSummary({
      kind: "updated",
      changes: [
        { field: "title", from: "Gala", to: "Spring Gala" },
        { field: "type", from: "function", to: "wedding" },
        { field: "status", from: "new_lead", to: "lost" },
      ],
    })).toBe("Renamed from “Gala” · Type → Wedding · +1 more")
  })
})

describe("changeRows", () => {
  it("labels fields and formats values, with null for empty ones", () => {
    expect(changeRows([
      { field: "status", from: "new_lead", to: "closed" },
      { field: "startDateTime", from: null, to: june12 },
    ])).toEqual([
      { field: "status", label: "Status", from: "New Lead", to: "Complete" },
      { field: "startDateTime", label: "Starts", from: null, to: "Sat, Jun 12, 2027, 6:00 PM" },
    ])
  })
})

describe("notificationAttribution", () => {
  it("says who did what, falling back when the account is gone", () => {
    expect(notificationAttribution({ kind: "updated", actorName: "Tess" })).toBe("Tess changed this event")
    expect(notificationAttribution({ kind: "deleted", actorName: null })).toBe("A teammate deleted this event")
  })
})
