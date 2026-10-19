import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import { getEventsMonthQueryKey } from "~/hooks/eventsCache"
import * as eventsApi from "~/lib/data/events"
import { createTestQueryClient } from "~/test/renderHookWithProviders"

import { getAdjacentMonthsStatus, useAdjacentMonthsEvents } from "./useAdjacentMonthsEvents"

vi.mock("~/lib/data/events", () => ({
  getEventsByMonth: vi.fn(),
}))

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    title: "Event",
    type: "function",
    status: "confirmed",
    startDateTime: "2027-06-12T12:00:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

function renderWithClient(queryClient: QueryClient, month: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useAdjacentMonthsEvents(month), { wrapper })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useAdjacentMonthsEvents", () => {
  it("fetches a month whose cache only holds an optimistic save", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const saved = makeEvent({ id: "saved", startDateTime: "2027-06-12T12:00:00" })
    const existing = makeEvent({ id: "existing", startDateTime: "2027-06-20T12:00:00" })
    getEventsByMonthMock.mockImplementation(async (month) => (month === "2027-06" ? [saved, existing] : []))

    const queryClient = createTestQueryClient()
    // What createEvent's optimistic update leaves in a month nobody had loaded.
    queryClient.setQueryData(getEventsMonthQueryKey("2027-06"), [saved])

    const { result } = renderWithClient(queryClient, "2027-06")

    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(getEventsByMonthMock).toHaveBeenCalledWith("2027-06")
    expect(result.current.events.map((event) => event.id)).toEqual(["saved", "existing"])
  })

  it("reports a failed month instead of an empty one, and retries it", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    getEventsByMonthMock.mockImplementation(async (month) => {
      if (month === "2027-06") throw new Error("offline")
      return []
    })

    const { result } = renderWithClient(createTestQueryClient(), "2027-06")

    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.events).toEqual([])

    getEventsByMonthMock.mockResolvedValue([makeEvent({ id: "booked" })])
    const callsBeforeRetry = getEventsByMonthMock.mock.calls.length
    act(() => result.current.retry())

    await waitFor(() => expect(result.current.status).toBe("ready"))
    // Only the failed month is refetched.
    expect(getEventsByMonthMock.mock.calls.slice(callsBeforeRetry)).toEqual([["2027-06"]])
    expect(result.current.events.map((event) => event.id)).toEqual(["booked"])
  })
})

describe("getAdjacentMonthsStatus", () => {
  const ready = { isError: false, isFetching: false, isSuccess: true }

  it("is ready once every month has loaded", () => {
    expect(getAdjacentMonthsStatus([ready, ready, ready])).toBe("ready")
  })

  it("is loading while any month is fetching, even with cached data", () => {
    expect(getAdjacentMonthsStatus([ready, { ...ready, isFetching: true }, ready])).toBe("loading")
    expect(getAdjacentMonthsStatus([ready, { isError: false, isFetching: false, isSuccess: false }, ready])).toBe("loading")
  })

  it("is an error if any month failed, even when others loaded", () => {
    expect(getAdjacentMonthsStatus([ready, { isError: true, isFetching: false, isSuccess: false }, ready])).toBe("error")
  })

  it("goes back to loading while a failed month retries", () => {
    expect(getAdjacentMonthsStatus([ready, { isError: true, isFetching: true, isSuccess: false }, ready])).toBe("loading")
  })
})
