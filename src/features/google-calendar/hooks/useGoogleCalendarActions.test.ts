import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useGoogleCalendarActions } from "./useGoogleCalendarActions"
import { pushEventToGoogleCalendar, removeEventFromGoogleCalendar } from "~/lib/data/googleCalendar"

vi.mock("~/lib/data/googleCalendar", () => ({
  getGoogleCalendarEventUrl: vi.fn(),
  pushEventToGoogleCalendar: vi.fn(async () => ({ eventUrl: "https://calendar.google.com/calendar/event?eid=abc" })),
  removeEventFromGoogleCalendar: vi.fn(async () => ({ deletedFromGoogle: true })),
}))

describe("useGoogleCalendarActions", () => {
  it("runs one action when a second starts before the next render", async () => {
    const clearLink = vi.fn(async () => undefined)
    const { result } = renderHook(() => useGoogleCalendarActions("event-1", true, clearLink))

    await act(async () => {
      const { push, remove, disconnect } = result.current
      await Promise.all([push(), push(), remove(), disconnect()])
    })

    expect(pushEventToGoogleCalendar).toHaveBeenCalledTimes(1)
    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()
    expect(clearLink).not.toHaveBeenCalled()
  })
})
