import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"
import { createTestQueryClient, renderHookWithProviders } from "~/test/renderHookWithProviders"
import { getEventsMonthQueryKey } from "./eventsCache"
import { useEventsMonthQuery } from "./useEventsMonthQuery"

vi.mock("~/lib/ipc/ipcEventsQueries", () => ({
  getEventsByMonth: vi.fn(),
}))

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Event 1",
    type: "function",
    status: "new_lead",
    startDateTime: "2026-04-10T12:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useEventsMonthQuery missing-only fetch policy", () => {
  it("fetches when month cache is missing", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    getEventsByMonthMock.mockResolvedValue([makeEvent()])

    const { result } = renderHookWithProviders(() =>
      useEventsMonthQuery("2026-04", {
        fetchPolicy: "missing-only",
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      }),
    )

    await waitFor(() => expect(result.current.monthQuery.isSuccess).toBe(true))

    expect(getEventsByMonthMock).toHaveBeenCalledWith("2026-04")
    expect(result.current.events).toHaveLength(1)
  })

  it("does not fetch when month cache exists with an empty array", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(getEventsMonthQueryKey("2026-04"), [])

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () =>
        useEventsMonthQuery("2026-04", {
          fetchPolicy: "missing-only",
          staleTime: Number.POSITIVE_INFINITY,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.events).toEqual([]))
    expect(getEventsByMonthMock).not.toHaveBeenCalled()
    expect(result.current.hasCachedData).toBe(true)
  })

  it("does not fetch when month cache exists with event data", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(getEventsMonthQueryKey("2026-04"), [makeEvent()])

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () =>
        useEventsMonthQuery("2026-04", {
          fetchPolicy: "missing-only",
          staleTime: Number.POSITIVE_INFINITY,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.events).toHaveLength(1))
    expect(getEventsByMonthMock).not.toHaveBeenCalled()
    expect(result.current.hasCachedData).toBe(true)
  })
})
