import { describe, expect, it } from "vitest"

import type { Touchpoint } from "~/definitions/database"

import { groupOverviewTouchpoints } from "./groupOverviewTouchpoints"

function tp(overrides: Partial<Touchpoint> & Pick<Touchpoint, "id" | "title">): Touchpoint {
  return {
    eventId: "event-1",
    dueDate: null,
    completedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("groupOverviewTouchpoints", () => {
  const now = new Date(2026, 6, 16)

  it("groups incomplete by urgency order and omits empty sections", () => {
    const { sections, completed } = groupOverviewTouchpoints(
      [
        tp({ id: "1", title: "Far", dueDate: "2026-07-25T00:00:00.000Z" }),
        tp({ id: "2", title: "Today", dueDate: "2026-07-16T00:00:00.000Z" }),
        tp({ id: "3", title: "Past", dueDate: "2026-07-14T00:00:00.000Z" }),
        tp({ id: "4", title: "Soon", dueDate: "2026-07-18T00:00:00.000Z" }),
        tp({ id: "5", title: "No date", dueDate: null }),
      ],
      now,
    )

    expect(sections.map((s) => s.key)).toEqual([
      "due today",
      "past due",
      "upcoming",
      "later",
    ])
    expect(sections.find((s) => s.key === "due today")?.items.map((i) => i.title)).toEqual([
      "Today",
    ])
    expect(sections.find((s) => s.key === "later")?.items.map((i) => i.title)).toEqual([
      "Far",
      "No date",
    ])
    expect(completed).toHaveLength(0)
  })

  it("sorts incomplete sections by due date ascending with nulls last", () => {
    const { sections } = groupOverviewTouchpoints(
      [
        tp({ id: "1", title: "No date", dueDate: null }),
        tp({ id: "2", title: "Later B", dueDate: "2026-08-02T00:00:00.000Z" }),
        tp({ id: "3", title: "Later A", dueDate: "2026-07-25T00:00:00.000Z" }),
      ],
      now,
    )

    expect(sections).toHaveLength(1)
    expect(sections[0]?.items.map((i) => i.title)).toEqual(["Later A", "Later B", "No date"])
  })

  it("separates completed and sorts newest completion first", () => {
    const { sections, completed } = groupOverviewTouchpoints(
      [
        tp({
          id: "1",
          title: "Done older",
          dueDate: "2026-07-10T00:00:00.000Z",
          completedAt: "2026-07-11T00:00:00.000Z",
        }),
        tp({
          id: "2",
          title: "Open",
          dueDate: "2026-07-16T00:00:00.000Z",
        }),
        tp({
          id: "3",
          title: "Done newer",
          dueDate: "2026-07-12T00:00:00.000Z",
          completedAt: "2026-07-15T00:00:00.000Z",
        }),
      ],
      now,
    )

    expect(sections.map((s) => s.key)).toEqual(["due today"])
    expect(completed.map((i) => i.title)).toEqual(["Done newer", "Done older"])
  })
})
