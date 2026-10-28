import { act, fireEvent, render } from "@testing-library/react"
import { writeFileSync } from "node:fs"
import { MemoryRouter } from "react-router"
import { afterEach, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import EventsCalendar from "~/features/calendar/views/EventsCalendar"
import MonthNavigator from "~/features/calendar/navigation/MonthNavigator"
import CalendarHolidayNotice from "~/features/calendar/navigation/CalendarHolidayNotice"
import { parseHolidayFeed, entriesBetween } from "../convex/lib/holidayFeed"
import { CANADIAN_HOLIDAYS_EXCERPT } from "../convex/lib/holidayFeed.fixture"

const feed = parseHolidayFeed(CANADIAN_HOLIDAYS_EXCERPT, new Date("2026-10-28T12:00:00Z"))
const STATUSES = ["confirmed", "tentative", "new_lead", "confirmed", "closed", "tentative"] as const
const NAMES = ["Smith Wedding", "Rotary Golf Classic", "Holiday Party", "Board Dinner", "Staff Lunch", "Charity Gala"]
function ev(date: string, i: number): Event {
  return {
    id: `${date}-${i}`, title: NAMES[i % NAMES.length], type: "function", status: STATUSES[i % STATUSES.length],
    startDateTime: `${date}T${String(11 + i).padStart(2, "0")}:00:00`, endDateTime: null, minGuests: 40 + i * 20, maxGuests: 80 + i * 20,
    guestCountFinal: null, calendarId: "c", createdAt: "2026-01-01T00:00:00Z", updatedAt: null,
  } as Event
}
const tick = () => act(() => new Promise((r) => setTimeout(r, 30)))

function mockLayout(gridWidth: number, gridHeight: number, listHeight: number, lineHeight: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.dataset.testid === "calendar-grid" ? gridWidth : gridWidth / 7
  })
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === "calendar-grid") return gridHeight
    return this.dataset.density ? listHeight : 1000
  })
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const parent = this.parentElement
    if (parent?.dataset.density) {
      const index = Array.from(parent.children).indexOf(this)
      return { top: 0, bottom: lineHeight * (index + 1), left: 0, right: 0, width: 0, height: lineHeight, x: 0, y: 0, toJSON() {} } as DOMRect
    }
    return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect
  })
}

async function capture(name: string, month: string, today: string, events: Event[], openDay: number, size: [number, number, number, number]) {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(`${today}T12:00:00`))
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  mockLayout(...size)
  const [y, m] = month.split("-").map(Number)
  const holidays = entriesBetween(feed.entries, `${month}-01`, `${y}-${String(m + 1).padStart(2, "0")}-01`)
  const { container, unmount } = render(
    <MemoryRouter><div style={{ height: "100%" }}>
      <EventsCalendar events={events} date={month} onDateChange={() => {}} holidays={holidays} />
    </div></MemoryRouter>,
  )
  await tick()
  const marker = container.querySelector<HTMLElement>(`[data-day-of-month="${openDay}"] [data-holiday-marker]`)!
  fireEvent.focus(marker)
  await tick()
  const portals = Array.from(document.body.children).filter((el) => el !== container).map((el) => el.outerHTML).join("")
  writeFileSync(`/tmp/holiday-ui/${name}.html`, `<div class="cal">${container.innerHTML}</div><div class="portals">${portals}</div>`)
  unmount()
  vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals()
}

afterEach(() => { document.body.innerHTML = "" })

it("captures wide December 2026", async () => {
  const events = [
    ...Array.from({ length: 5 }, (_, i) => ev("2026-12-24", i)),
    ...Array.from({ length: 2 }, (_, i) => ev("2026-12-26", i + 1)),
    ev("2026-12-11", 3), ev("2026-12-18", 0), ev("2026-12-18", 1), ev("2026-12-18", 2), ev("2026-12-31", 2), ev("2026-12-05", 0),
  ]
  await capture("wide", "2026-12", "2026-12-24", events, 24, [1400, 1800, 1000, 18])
})

it("captures narrow August 2027", async () => {
  const events = [
    ...Array.from({ length: 6 }, (_, i) => ev("2027-08-02", i)),
    ...Array.from({ length: 4 }, (_, i) => ev("2027-08-04", i + 1)),
    ev("2027-08-07", 0), ev("2027-08-14", 1), ev("2027-08-21", 2),
  ]
  await capture("narrow", "2027-08", "2027-08-02", events, 2, [7 * 118, 5000, 54, 18])
})

it("captures notices", () => {
  const notices = [
    ["2032-03", { message: "Holiday dates aren't available for this year yet.", canRetry: false }],
    ["2026-12", { message: "Holidays may be out of date.", canRetry: false }],
    ["2026-12", { message: "Holidays couldn't be loaded.", canRetry: true }],
  ] as const
  const html = notices.map(([month, notice]) => {
    const { container, unmount } = render(
      <div className="flex min-w-0 items-center gap-4">
        <MonthNavigator month={month} onMonthChange={() => {}} onGoToToday={() => {}} />
        <CalendarHolidayNotice notice={notice} onRetry={() => {}} isRetrying={false} />
      </div>,
    )
    const out = container.innerHTML
    unmount()
    return `<div class="hdr">${out}</div>`
  }).join("")
  writeFileSync("/tmp/holiday-ui/notices.html", html)
})
