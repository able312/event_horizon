import { describe, expect, it } from "vitest"

import type { IncompleteTouchpointWithEvent } from "~/definitions/database"

import { groupSidebarTouchpoints, visibleSidebarItems } from "./groupSidebarTouchpoints"

function row(
  overrides: Partial<IncompleteTouchpointWithEvent> & Pick<IncompleteTouchpointWithEvent, "dueDate">,
): IncompleteTouchpointWithEvent {
  return {
    id: overrides.id ?? "tp-1",
    eventId: overrides.eventId ?? "event-1",
    title: overrides.title ?? "Touchpoint",
    dueDate: overrides.dueDate,
    completedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    eventTitle: overrides.eventTitle ?? "Event",
  }
}

describe("groupSidebarTouchpoints", () => {
  const now = new Date(2026, 6, 16)

  it("groups by urgency, hides standard, and omits empty sections", () => {
    const sections = groupSidebarTouchpoints(
      [
        row({ id: "1", dueDate: "2026-07-16T00:00:00.000Z", title: "Today" }),
        row({ id: "2", dueDate: "2026-07-14T00:00:00.000Z", title: "Past" }),
        row({ id: "3", dueDate: "2026-07-18T00:00:00.000Z", title: "Soon" }),
        row({ id: "4", dueDate: "2026-07-25T00:00:00.000Z", title: "Far" }),
      ],
      now,
    )

    expect(sections.map((s) => s.key)).toEqual(["due today", "past due", "upcoming"])
    expect(sections.find((s) => s.key === "due today")?.items[0]?.title).toBe("Today")
    expect(sections.some((s) => s.items.some((i) => i.title === "Far"))).toBe(false)
  })
})

describe("visibleSidebarItems", () => {
  it("caps collapsed sections and reports hidden count", () => {
    const section = {
      key: "due today" as const,
      label: "Due today",
      cap: 3,
      items: [1, 2, 3, 4, 5].map((n) =>
        row({
          id: `tp-${n}`,
          dueDate: "2026-07-16T00:00:00.000Z",
          title: `Item ${n}`,
        }),
      ).map((item) => ({ ...item, urgency: "due today" as const })),
    }

    const collapsed = visibleSidebarItems(section, false)
    expect(collapsed.visible).toHaveLength(3)
    expect(collapsed.hiddenCount).toBe(2)

    const expanded = visibleSidebarItems(section, true)
    expect(expanded.visible).toHaveLength(5)
    expect(expanded.hiddenCount).toBe(0)
  })
})
