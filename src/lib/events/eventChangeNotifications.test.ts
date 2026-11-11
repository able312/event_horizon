import { describe, expect, it } from "vitest"

import {
  canMergeIntoNotification,
  createdEventFields,
  diffNotifiedFields,
  EVENT_NOTIFICATION_MERGE_WINDOW_MS,
  mergeEventChanges,
  type NotifiedEventSnapshot,
} from "./eventChangeNotifications"

const event: NotifiedEventSnapshot = { title: "Gala", type: "function", status: "new_lead", startDateTime: null, endDateTime: null }

describe("diffNotifiedFields", () => {
  it("lists only the notified fields that changed", () => {
    expect(diffNotifiedFields(event, { ...event })).toEqual([])
    expect(diffNotifiedFields(event, { ...event, status: "lost", title: "Gala Night" })).toEqual([
      { field: "title", from: "Gala", to: "Gala Night" },
      { field: "status", from: "new_lead", to: "lost" },
    ])
  })
})

describe("createdEventFields", () => {
  it("describes a new event's filled-in fields", () => {
    expect(createdEventFields({ ...event, title: "" })).toEqual([
      { field: "type", from: null, to: "function" },
      { field: "status", from: null, to: "new_lead" },
    ])
  })
})

describe("mergeEventChanges", () => {
  it("keeps each field's first value and latest value, dropping changes that were undone", () => {
    const merged = mergeEventChanges(
      [{ field: "status", from: "new_lead", to: "tentative" }, { field: "title", from: "A", to: "B" }],
      [{ field: "status", from: "tentative", to: "confirmed" }, { field: "title", from: "B", to: "A" }, { field: "type", from: "function", to: "wedding" }],
    )
    expect(merged).toEqual([
      { field: "type", from: "function", to: "wedding" },
      { field: "status", from: "new_lead", to: "confirmed" },
    ])
  })
})

describe("canMergeIntoNotification", () => {
  const now = new Date("2026-11-11T12:00:00.000Z")
  const recent = { kind: "updated" as const, actorId: "u1", createdAt: "2026-11-11T11:55:00.000Z" }

  it("merges the same person's edits within the window", () => {
    expect(canMergeIntoNotification(recent, "u1", now)).toBe(true)
    expect(canMergeIntoNotification({ ...recent, kind: "created" }, "u1", now)).toBe(true)
  })

  it("starts a new notification for someone else, a deleted event or an older notification", () => {
    expect(canMergeIntoNotification(recent, "u2", now)).toBe(false)
    expect(canMergeIntoNotification({ ...recent, kind: "deleted" }, "u1", now)).toBe(false)
    const old = new Date(now.getTime() - EVENT_NOTIFICATION_MERGE_WINDOW_MS - 1).toISOString()
    expect(canMergeIntoNotification({ ...recent, createdAt: old }, "u1", now)).toBe(false)
  })
})
