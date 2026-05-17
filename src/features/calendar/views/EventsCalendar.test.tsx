import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import EventsCalendar from "./EventsCalendar"

vi.mock("~/features/calendar/views/CalendarGrid", () => ({
  default: () => (
    <div data-testid="calendar-grid-mock">
      <div data-testid="calendar-day-events-10">scroll-zone</div>
    </div>
  ),
}))

function renderCalendar({ date = "2026-04", onDateChange = vi.fn() } = {}) {
  return {
    onDateChange,
    ...render(
      <EventsCalendar
        events={[] as Event[]}
        date={date}
        onDateChange={onDateChange}
      />,
    ),
  }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("EventsCalendar wheel month snap", () => {
  it("snaps to next month on downward wheel", () => {
    const { onDateChange } = renderCalendar({ date: "2026-04" })

    fireEvent.wheel(screen.getByText("Sun"), { deltaY: 90 })

    expect(onDateChange).toHaveBeenCalledWith("2026-05")
  })

  it("snaps to previous month on upward wheel", () => {
    const { onDateChange } = renderCalendar({ date: "2026-04" })

    fireEvent.wheel(screen.getByText("Sun"), { deltaY: -90 })

    expect(onDateChange).toHaveBeenCalledWith("2026-03")
  })

  it("applies cooldown so a single gesture does not skip multiple months", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"))

    const { onDateChange } = renderCalendar({ date: "2026-04" })

    fireEvent.wheel(screen.getByText("Sun"), { deltaY: 90 })
    fireEvent.wheel(screen.getByText("Sun"), { deltaY: 90 })

    expect(onDateChange).toHaveBeenCalledTimes(1)
    expect(onDateChange).toHaveBeenCalledWith("2026-05")

    vi.advanceTimersByTime(301)
    fireEvent.wheel(screen.getByText("Sun"), { deltaY: 90 })

    expect(onDateChange).toHaveBeenCalledTimes(2)
    expect(onDateChange).toHaveBeenLastCalledWith("2026-05")
  })

  it("snaps month when wheel originates from day events area", () => {
    const { onDateChange } = renderCalendar({ date: "2026-04" })

    fireEvent.wheel(screen.getByTestId("calendar-day-events-10"), { deltaY: 120 })

    expect(onDateChange).toHaveBeenCalledWith("2026-05")
  })
})
