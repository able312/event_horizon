import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
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
  it("renders system rows as read-only", () => {
    const updateTimeblock = vi.fn()
    const systemRow = makeTimeblock({
      timelineMeta: {
        source: "event_start",
        isSystem: true,
        isEditable: false,
      },
    })

    render(<TimelineBlock timeblock={systemRow} updateTimeblock={updateTimeblock} />)

    const timeInput = screen.getByDisplayValue("09:00") as HTMLInputElement
    expect(timeInput.disabled).toBe(true)

    fireEvent.blur(timeInput, { target: { value: "10:00" } })
    expect(updateTimeblock).not.toHaveBeenCalled()
  })

  it("keeps editable rows writable and updates on blur", () => {
    const updateTimeblock = vi.fn()
    const editableRow = makeTimeblock({
      id: "timeblock-editable",
      timelineMeta: {
        source: "timeblock",
        isSystem: false,
        isEditable: true,
      },
    })

    render(<TimelineBlock timeblock={editableRow} updateTimeblock={updateTimeblock} />)

    const timeInput = screen.getByDisplayValue("09:00") as HTMLInputElement
    expect(timeInput.disabled).toBe(false)

    fireEvent.blur(timeInput, { target: { value: "10:00" } })
    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "timeblock-editable",
      updates: { time: "10:00" },
    })
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
        updateTimeblock={vi.fn()}
      />,
    )

    expect(screen.getByText("Serve from the pavilion")).toBeTruthy()
    expect(screen.getByText("40 x Steak")).toBeTruthy()
  })
})
