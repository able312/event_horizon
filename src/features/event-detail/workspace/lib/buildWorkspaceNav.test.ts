import { describe, expect, it } from "vitest"

import { buildWorkspaceNav } from "./buildWorkspaceNav"
import type { TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"

const makeTimelineRow = (overrides: Partial<TimelineTimeblock>): TimelineTimeblock => ({
  id: overrides.id ?? "tb-1",
  eventId: overrides.eventId ?? "event-1",
  title: overrides.title ?? "Node",
  time: overrides.time ?? "10:00",
  sectionType: overrides.sectionType ?? "note",
  assignedTo: overrides.assignedTo ?? null,
  createdAt: overrides.createdAt ?? "1",
  updatedAt: overrides.updatedAt ?? null,
  timelineMeta: overrides.timelineMeta ?? {
    source: "timeblock",
    isSystem: false,
    isEditable: true,
  },
  ...overrides,
  details: overrides.details ?? null,
})

const makeSectionRow = (overrides: Partial<TimeblockWithItems>): TimeblockWithItems => ({
  id: overrides.id ?? "tb-1",
  eventId: overrides.eventId ?? "event-1",
  title: overrides.title ?? "Node",
  time: overrides.time ?? "",
  sectionType: overrides.sectionType ?? "note",
  assignedTo: overrides.assignedTo ?? null,
  createdAt: overrides.createdAt ?? "1",
  updatedAt: overrides.updatedAt ?? null,
  ...overrides,
  details: overrides.details ?? null,
})

describe("buildWorkspaceNav", () => {
  it("sorts scheduled nodes and groups unscheduled and categories", () => {
    const timelineRows = [
      makeTimelineRow({ id: "b", time: "11:30", title: "Bravo" }),
      makeTimelineRow({ id: "a", time: "09:00", title: "Alpha" }),
      makeTimelineRow({
        id: "sys",
        time: "08:00",
        title: "Event Start",
        timelineMeta: { source: "event_start", isSystem: true, isEditable: false },
      }),
    ]

    const sectionRows = [
      makeSectionRow({ id: "u1", title: "Prep", time: "", sectionType: "setup_instruction" }),
      makeSectionRow({ id: "u2", title: "No Time", time: null, sectionType: "food" }),
      makeSectionRow({ id: "u1", title: "Prep duplicate", time: "", sectionType: "setup_instruction" }),
    ]

    const nav = buildWorkspaceNav({
      event: { type: "tournament" } as never,
      timelineRows,
      sectionRows,
    })

    expect(nav.scheduled.map((n) => n.label)).toEqual(["Event Start", "Alpha", "Bravo"])
    expect(nav.scheduled[0].nodeType).toBe("system")
    expect(nav.unscheduled.map((n) => n.id)).toEqual(["unscheduled:u2", "unscheduled:u1"])
    expect(nav.categories.map((n) => n.id)).toEqual([
      "category:overview",
      "category:food",
      "category:beverage",
      "category:logistics",
      "category:tournament",
      "category:financial",
    ])
    expect(nav.categories.some((n) => n.id === "category:notes")).toBe(false)
    expect(nav.categories.some((n) => n.id === "category:setup")).toBe(false)
    expect(nav.unscheduled.find((n) => n.id === "unscheduled:u1")?.subLabel).toBe("Setup Instruction")
    expect(nav.unscheduled.find((n) => n.id === "unscheduled:u1")?.assignedTo).toBeNull()
  })
})
