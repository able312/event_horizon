import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import EventTimeline from "./EventTimeline"

const mockUseTimeline = vi.fn()

vi.mock("~/hooks/useTimeline", () => ({
  useTimeline: () => mockUseTimeline(),
}))

vi.mock("./TimelineBlock", () => ({
  default: ({ timeblock }: { timeblock: TimelineTimeblock }) => {
    return (
      <div data-testid="timeline-block">
        {timeblock.time} | {timeblock.title} | {timeblock.id}
      </div>
    )
  },
}))

const DEFAULT_SECTION_TYPE: TimelineTimeblock["sectionType"] = "note"

function makeTimeblock(overrides: Partial<TimelineTimeblock>): TimelineTimeblock {
  return {
    id: overrides.id ?? "timeblock-default",
    eventId: overrides.eventId ?? "event-1",
    title: overrides.title ?? "Untitled",
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

afterEach(() => {
  mockUseTimeline.mockReset()
})

describe("EventTimeline", () => {
  it('renders "Loading..." while timeline data is loading', () => {
    mockUseTimeline.mockReturnValue({
      data: undefined,
      isLoading: true,
      updateTimeblock: vi.fn(),
    })

    render(<EventTimeline />)

    expect(screen.getByText("Loading...")).toBeTruthy()
  })

  it("shows empty state when the sorted timeline result is empty", () => {
    mockUseTimeline.mockReturnValue({
      data: [
        makeTimeblock({ id: "blank", title: "Blank", time: "" }),
        makeTimeblock({ id: "spaces", title: "Spaces", time: "   " }),
      ],
      isLoading: false,
      updateTimeblock: vi.fn(),
    })

    render(<EventTimeline />)

    expect(
      screen.getByText("Add timeblocks with times to see them in the timeline."),
    ).toBeTruthy()
  })

  it("renders timeline blocks in sorted order", () => {
    mockUseTimeline.mockReturnValue({
      data: [
        makeTimeblock({ id: "c", time: "10:00", title: "Ceremony" }),
        makeTimeblock({ id: "a", time: "09:00", title: "Arrival" }),
        makeTimeblock({ id: "b", time: "10:00", title: "Ceremony" }),
      ],
      isLoading: false,
      updateTimeblock: vi.fn(),
    })

    render(<EventTimeline />)

    const timelineBlocks = screen.getAllByTestId("timeline-block")

    expect(timelineBlocks.map((block) => block.textContent)).toEqual([
      "09:00 | Arrival | a",
      "10:00 | Ceremony | b",
      "10:00 | Ceremony | c",
    ])
  })
})
