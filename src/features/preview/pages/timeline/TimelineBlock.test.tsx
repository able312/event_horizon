import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import TimelineBlock from "./TimelineBlock"

const DEFAULT_SECTION_TYPE: TimelineTimeblock["sectionType"] = "note"

function makeTimeblock(overrides: Partial<TimelineTimeblock> = {}): TimelineTimeblock {
  return {
    id: overrides.id ?? "timeblock-1",
    eventId: overrides.eventId ?? "event-1",
    title: overrides.title ?? "Timeline Block",
    time: overrides.time ?? "09:00",
    sectionType: overrides.sectionType ?? DEFAULT_SECTION_TYPE,
    assignedTo: overrides.assignedTo ?? null,
    createdAt: overrides.createdAt ?? "123456",
    updatedAt: overrides.updatedAt ?? null,
    timelineMeta: overrides.timelineMeta ?? {
      source: "timeblock",
      isSystem: false,
      isEditable: true,
    },
    ...overrides,
    details: overrides.details ?? null,
  }
}

describe("TimelineBlock", () => {
  it("renders times as read-only text for persisted and system rows", () => {
    const { rerender } = render(
      <TimelineBlock
        timeblock={makeTimeblock({
          timelineMeta: {
            source: "timeblock",
            isSystem: false,
            isEditable: true,
          },
        })}
      />,
    )

    expect(screen.getByText("09:00")).toBeTruthy()
    expect(screen.queryByDisplayValue("09:00")).toBeNull()
    expect(document.querySelector('input[type="time"]')).toBeNull()

    rerender(
      <TimelineBlock
        timeblock={makeTimeblock({
          time: "10:30",
          timelineMeta: {
            source: "event_start",
            isSystem: true,
            isEditable: false,
          },
        })}
      />,
    )

    expect(screen.getByText("10:30")).toBeTruthy()
    expect(document.querySelector('input[type="time"]')).toBeNull()
  })

  it("renders food overview notes before menu items", () => {
    render(
      <TimelineBlock
        timeblock={makeTimeblock({
          sectionType: "food",
          details: "Serve from the pavilion",
          foodItems: [
            {
              id: "item-1",
              timeblockId: "timeblock-1",
              name: "Steak",
              quantity: 40,
              serviceStyle: "Plated",
              includes: "Medium",
              unitPriceCents: 4500,
            },
          ],
        })}
      />,
    )

    expect(screen.getByText("Serve from the pavilion")).toBeTruthy()
    expect(screen.getByText("40 x Steak")).toBeTruthy()
    expect(screen.getByText("Medium")).toBeTruthy()
  })

  it("renders markdown-capable details through the shared renderer", () => {
    render(
      <TimelineBlock
        timeblock={makeTimeblock({
          sectionType: "note",
          details: "# Details\nServe **hot**\n* Item one",
        })}
      />,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Details" })).toBeTruthy()
    expect(screen.getByText("hot").tagName).toBe("STRONG")
    expect(screen.getByRole("list")).toBeTruthy()
    expect(screen.getByText("Item one")).toBeTruthy()
  })

  it("keeps food item includes as plain text without markdown parsing", () => {
    render(
      <TimelineBlock
        timeblock={makeTimeblock({
          sectionType: "food",
          foodItems: [
            {
              id: "item-1",
              timeblockId: "timeblock-1",
              name: "Salad",
              quantity: 10,
              serviceStyle: "Buffet",
              includes: "# Not a heading\n**not bold**",
              unitPriceCents: 1200,
            },
          ],
        })}
      />,
    )

    expect(screen.queryByRole("heading", { name: "Not a heading" })).toBeNull()
    const plainNotes = document.querySelector("pre")
    expect(plainNotes?.tagName).toBe("PRE")
    expect(plainNotes?.textContent).toBe("# Not a heading\n**not bold**")
    expect(plainNotes?.querySelector("strong")).toBeNull()
  })

  it("renders cart details markdown and the cart grid", () => {
    render(
      <TimelineBlock
        timeblock={makeTimeblock({
          sectionType: "cart_detail",
          cartDetails: {
            whatGoesOnCarts: "# Goes on carts\nWater bottles",
            customGrid: [
              [1, 2, null, 3, null, 4],
              ["Lead", null, "Lead", null, null, null],
            ],
          },
        })}
      />,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Goes on carts" })).toBeTruthy()
    expect(screen.getByText("Water bottles")).toBeTruthy()
    expect(screen.getByText("Requires 6 carts.")).toBeTruthy()
    expect(
      screen.getByText("⚠️ DO NOT leave keys in carts or hand out keys before tournament start time"),
    ).toBeTruthy()
  })
})
