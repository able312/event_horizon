import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import SidebarMiniCalendar from "./SidebarMiniCalendar"

type CalendarMockProps = {
  fixedWeeks?: boolean
  showOutsideDays?: boolean
  month?: Date
  onMonthChange?: (month: Date) => void
  onDayClick?: (day: Date) => void
  components?: {
    DayButton?: (props: Record<string, unknown>) => ReactNode
  }
}

let latestCalendarProps: CalendarMockProps | null = null

vi.mock("~/components/ui/calendar", () => ({
  CalendarDayButton: (args: {
    children?: ReactNode
    day?: unknown
    modifiers?: unknown
    [key: string]: unknown
  }) => {
    const { children, day, modifiers, ...buttonProps } = args
    void day
    void modifiers
    return (
      <button type="button" {...buttonProps}>
        {children}
      </button>
    )
  },
  Calendar: (props: CalendarMockProps) => {
    latestCalendarProps = props
    const DayButton = props.components?.DayButton

    return (
      <div data-testid="calendar-mock">
        <button
          type="button"
          onClick={() => props.onMonthChange?.(new Date(2026, 5, 1))}
        >
          trigger-month-change
        </button>
        <button
          type="button"
          onClick={() => props.onDayClick?.(new Date(2026, 6, 14))}
        >
          trigger-day-click
        </button>

        {DayButton ? (
          <div data-testid="calendar-day-buttons">
            <DayButton
              day={{ date: new Date(2026, 3, 10) }}
              modifiers={{ outside: false }}
            >
              10
            </DayButton>
            <DayButton
              day={{ date: new Date(2026, 3, 11) }}
              modifiers={{ outside: false }}
            >
              11
            </DayButton>
            <DayButton
              day={{ date: new Date(2026, 3, 12) }}
              modifiers={{ outside: false }}
            >
              12
            </DayButton>
            <DayButton
              day={{ date: new Date(2026, 2, 31) }}
              modifiers={{ outside: true }}
            >
              31
            </DayButton>
          </div>
        ) : null}
      </div>
    )
  },
}))

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    title: "Event",
    type: "function",
    status: "new_lead",
    startDateTime: "2026-04-10T12:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

afterEach(() => {
  cleanup()
  latestCalendarProps = null
  vi.clearAllMocks()
})

describe("SidebarMiniCalendar", () => {
  it("renders Calendar with fixed weeks and outside days enabled", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    expect(screen.getByTestId("calendar-mock")).toBeTruthy()
    expect(latestCalendarProps?.fixedWeeks).toBe(true)
    expect(latestCalendarProps?.showOutsideDays).toBe(true)
  })

  it("maps incoming month param to the first day of that month", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    expect(latestCalendarProps?.month).toBeInstanceOf(Date)
    expect(latestCalendarProps?.month?.getFullYear()).toBe(2026)
    expect(latestCalendarProps?.month?.getMonth()).toBe(3)
    expect(latestCalendarProps?.month?.getDate()).toBe(1)
  })

  it("routes mini month navigation through onBrowseMonthChange only", () => {
    const onBrowseMonthChange = vi.fn()
    const onSelectMonth = vi.fn()
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[]}
        onBrowseMonthChange={onBrowseMonthChange}
        onSelectMonth={onSelectMonth}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "trigger-month-change" }))

    expect(onBrowseMonthChange).toHaveBeenCalledWith("2026-06")
    expect(onSelectMonth).not.toHaveBeenCalled()
  })

  it("routes day clicks through onSelectMonth only", () => {
    const onBrowseMonthChange = vi.fn()
    const onSelectMonth = vi.fn()
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[]}
        onBrowseMonthChange={onBrowseMonthChange}
        onSelectMonth={onSelectMonth}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "trigger-day-click" }))

    expect(onSelectMonth).toHaveBeenCalledWith("2026-07")
    expect(onBrowseMonthChange).not.toHaveBeenCalled()
  })

  it("renders one dot for a single event and two horizontal dots for two events", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[
          makeEvent({
            id: "one",
            type: "function",
            startDateTime: "2026-04-10T12:00:00.000Z",
          }),
          makeEvent({
            id: "two-a",
            type: "function",
            startDateTime: "2026-04-11T09:00:00.000Z",
          }),
          makeEvent({
            id: "two-b",
            type: "tournament",
            startDateTime: "2026-04-11T10:00:00.000Z",
          }),
        ]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    const day10 = document.querySelector('button[data-mini-day="2026-04-10"]')
    const day11 = document.querySelector('button[data-mini-day="2026-04-11"]')

    expect(day10?.querySelector('[data-mini-marker="dot"]')).toBeTruthy()
    expect(day10?.querySelectorAll("[data-mini-marker-dot]").length).toBe(1)

    expect(day11?.querySelector('[data-mini-marker="dots"]')).toBeTruthy()
    expect(day11?.querySelectorAll("[data-mini-marker-dot]").length).toBe(2)
  })

  it("renders a numeric marker only when a day has more than two events", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[
          makeEvent({
            id: "three-a",
            type: "function",
            startDateTime: "2026-04-12T09:00:00.000Z",
          }),
          makeEvent({
            id: "three-b",
            type: "tournament",
            startDateTime: "2026-04-12T10:00:00.000Z",
          }),
          makeEvent({
            id: "three-c",
            type: "wedding",
            startDateTime: "2026-04-12T11:00:00.000Z",
          }),
        ]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    const day12 = document.querySelector('button[data-mini-day="2026-04-12"]')
    const countMarker = day12?.querySelector('[data-mini-marker="count"]')

    expect(countMarker).toBeTruthy()
    expect(countMarker?.textContent).toBe("3")
    expect(day12?.querySelector("[data-mini-marker-dot]")).toBeNull()
  })

  it("does not render markers on outside days", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[
          makeEvent({
            id: "outside",
            startDateTime: "2026-03-31T12:00:00.000Z",
          }),
        ]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    const outsideDay = document.querySelector('button[data-mini-day="2026-03-31"]')
    expect(outsideDay?.getAttribute("data-mini-outside")).toBe("true")
    expect(outsideDay?.querySelector("[data-mini-marker]")).toBeNull()
    expect(outsideDay?.querySelector("[data-mini-marker-dot]")).toBeNull()
  })

  it("uses a neutral marker color for unknown event types", () => {
    render(
      <SidebarMiniCalendar
        month="2026-04"
        events={[
          makeEvent({
            id: "unknown-type",
            type: "corporate" as unknown as Event["type"],
            startDateTime: "2026-04-10T12:00:00.000Z",
          }),
        ]}
        onBrowseMonthChange={vi.fn()}
        onSelectMonth={vi.fn()}
      />,
    )

    const day10 = document.querySelector('button[data-mini-day="2026-04-10"]')
    const dot = day10?.querySelector("[data-mini-marker-dot]")

    expect(dot).toBeTruthy()
    expect(dot?.className).toContain("bg-stone-500")
  })
})
