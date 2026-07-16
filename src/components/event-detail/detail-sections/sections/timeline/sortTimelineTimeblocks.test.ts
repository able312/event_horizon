import { describe, expect, it } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { sortTimelineTimeblocks } from "./sortTimelineTimeblocks"

const DEFAULT_SECTION_TYPE: TimeblockWithItems["sectionType"] = "note"

function makeTimeblock(overrides: Partial<TimeblockWithItems>): TimeblockWithItems {
  return {
    id: overrides.id ?? "timeblock-default",
    eventId: overrides.eventId ?? "event-1",
    title: overrides.title ?? "Untitled",
    time: overrides.time ?? "09:00",
    sectionType: overrides.sectionType ?? DEFAULT_SECTION_TYPE,
    assignedTo: overrides.assignedTo ?? null,
    createdAt: overrides.createdAt ?? "123456",
    updatedAt: overrides.updatedAt ?? null,
    ...overrides,
    details: overrides.details ?? null,
  }
}

describe("sortTimelineTimeblocks", () => {
  it("sorts by time ascending", () => {
    const input = [
      makeTimeblock({ id: "b", time: "12:00", title: "Lunch" }),
      makeTimeblock({ id: "c", time: "10:30", title: "Setup" }),
      makeTimeblock({ id: "a", time: "08:00", title: "Arrival" }),
    ]

    const result = sortTimelineTimeblocks(input)

    expect(result.map((timeblock) => timeblock.id)).toEqual(["a", "c", "b"])
  })

  it("sorts ties on time by title", () => {
    const input = [
      makeTimeblock({ id: "c", time: "09:00", title: "Zulu" }),
      makeTimeblock({ id: "a", time: "09:00", title: "Alpha" }),
      makeTimeblock({ id: "b", time: "09:00", title: "Mike" }),
    ]

    const result = sortTimelineTimeblocks(input)

    expect(result.map((timeblock) => timeblock.title)).toEqual(["Alpha", "Mike", "Zulu"])
  })

  it("sorts ties on time and title by id", () => {
    const input = [
      makeTimeblock({ id: "c", time: "09:00", title: "Ceremony" }),
      makeTimeblock({ id: "a", time: "09:00", title: "Ceremony" }),
      makeTimeblock({ id: "b", time: "09:00", title: "Ceremony" }),
    ]

    const result = sortTimelineTimeblocks(input)

    expect(result.map((timeblock) => timeblock.id)).toEqual(["a", "b", "c"])
  })

  it("excludes blank and null times", () => {
    const input = [
      makeTimeblock({ id: "valid", time: "11:00", title: "Valid" }),
      makeTimeblock({ id: "blank", time: "", title: "Blank" }),
      makeTimeblock({ id: "spaces", time: "   ", title: "Spaces" }),
      makeTimeblock({ id: "null", time: null, title: "Null" }),
    ]

    const result = sortTimelineTimeblocks(input)

    expect(result.map((timeblock) => timeblock.id)).toEqual(["valid"])
  })

  it("returns deterministic output without mutating the input order", () => {
    const input = [
      makeTimeblock({ id: "2", time: "09:30", title: "Briefing" }),
      makeTimeblock({ id: "1", time: "09:30", title: "Briefing" }),
      makeTimeblock({ id: "3", time: "08:30", title: "Arrival" }),
    ]
    const inputOrderBeforeSort = input.map((timeblock) => timeblock.id)

    const first = sortTimelineTimeblocks(input).map((timeblock) => timeblock.id)
    const second = sortTimelineTimeblocks(input).map((timeblock) => timeblock.id)

    expect(first).toEqual(second)
    expect(input.map((timeblock) => timeblock.id)).toEqual(inputOrderBeforeSort)
  })
})
