import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useLayoutEffect, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import {
  PreviewPreferencesProvider,
  usePreviewPreferences,
} from "~/features/preview/preferences/PreviewPreferencesContext"
import TimelinePreview from "./TimelinePreview"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useTimeline: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))

vi.mock("~/hooks/useTimeline", () => ({
  useTimeline: hooksMock.useTimeline,
}))

vi.mock("./timeline/TimelineBlock", () => ({
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

function HideSystemRows({ children }: { children: ReactNode }) {
  const { dispatch } = usePreviewPreferences()
  useLayoutEffect(() => {
    dispatch({ type: "timeline/setIncludeSystemRows", value: false })
  }, [dispatch])
  return <>{children}</>
}

function renderTimeline(options?: { hideSystemRows?: boolean }) {
  const body = options?.hideSystemRows ? (
    <HideSystemRows>
      <TimelinePreview />
    </HideSystemRows>
  ) : (
    <TimelinePreview />
  )

  return render(<PreviewPreferencesProvider>{body}</PreviewPreferencesProvider>)
}

afterEach(() => {
  cleanup()
  hooksMock.useEvent.mockReset()
  hooksMock.useTimeline.mockReset()
})

describe("TimelinePreview", () => {
  it('renders "Loading..." while timeline data is loading', async () => {
    hooksMock.useEvent.mockReturnValue({
      data: { title: "Test Event", type: "social", minGuests: 10, maxGuests: 20 },
    })
    hooksMock.useTimeline.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    renderTimeline()

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeTruthy()
    })
  })

  it("shows empty state when the sorted timeline result is empty", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: { title: "Test Event", type: "social", minGuests: 10, maxGuests: 20 },
    })
    hooksMock.useTimeline.mockReturnValue({
      data: [
        makeTimeblock({ id: "blank", title: "Blank", time: "" }),
        makeTimeblock({ id: "spaces", title: "Spaces", time: "   " }),
      ],
      isLoading: false,
    })

    renderTimeline()

    await waitFor(() => {
      expect(
        screen.getByText("Add timeblocks with times to see them in the timeline."),
      ).toBeTruthy()
    })
  })

  it("renders timeline blocks in sorted order", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: { title: "Test Event", type: "social", minGuests: 10, maxGuests: 20 },
    })
    hooksMock.useTimeline.mockReturnValue({
      data: [
        makeTimeblock({ id: "c", time: "10:00", title: "Ceremony" }),
        makeTimeblock({ id: "a", time: "09:00", title: "Arrival" }),
        makeTimeblock({ id: "b", time: "10:00", title: "Ceremony" }),
      ],
      isLoading: false,
    })

    renderTimeline()

    await waitFor(() => {
      expect(screen.getAllByTestId("timeline-block").length).toBe(3)
    })

    const timelineBlocks = screen.getAllByTestId("timeline-block")

    expect(timelineBlocks.map((block) => block.textContent)).toEqual([
      "09:00 | Arrival | a",
      "10:00 | Ceremony | b",
      "10:00 | Ceremony | c",
    ])
  })

  it("can hide system tournament and cart rows", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: { title: "Test Event", type: "tournament", minGuests: 10, maxGuests: 20 },
    })
    hooksMock.useTimeline.mockReturnValue({
      data: [
        makeTimeblock({ id: "note-1", time: "09:00", title: "Arrival", sectionType: "note" }),
        makeTimeblock({
          id: "sys-tournament",
          time: "08:00",
          title: "Tournament",
          sectionType: "tournament_detail",
        }),
        makeTimeblock({
          id: "sys-cart",
          time: "07:30",
          title: "Cart Details",
          sectionType: "cart_detail",
        }),
      ],
      isLoading: false,
    })

    renderTimeline({ hideSystemRows: true })

    await waitFor(() => {
      expect(screen.getAllByTestId("timeline-block").length).toBe(1)
    })

    const timelineBlocks = screen.getAllByTestId("timeline-block")
    expect(timelineBlocks.map((block) => block.textContent)).toEqual([
      "09:00 | Arrival | note-1",
    ])
  })
})
