import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"

import { useEventsSearchQuery, type EventsSearchParams } from "./useEventsSearchQuery"
import * as eventsApi from "~/lib/data/events"

vi.mock("~/lib/data/events", () => ({
  searchEvents: vi.fn(),
}))

function wrapperFactory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useEventsSearchQuery", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each<Partial<EventsSearchParams>>([
    { type: "wedding" },
    { status: "confirmed" },
    { startFrom: "2026-10-01T00:00:00Z" },
    { startTo: "2026-11-01T00:00:00Z" },
    { type: "wedding", status: "confirmed", query: "a" },
  ])("searches without requiring text when filters are set: %o", async (filters) => {
    const params: EventsSearchParams = {
      query: "  ", type: null, status: null, startFrom: null, startTo: null,
      page: 0, pageSize: 50, ...filters,
    }
    vi.mocked(eventsApi.searchEvents).mockResolvedValue({
      items: [], total: 3, page: 0, pageSize: 50, hasMore: false,
    })
    const { result, rerender } = renderHook(
      (input) => useEventsSearchQuery(input),
      { wrapper: wrapperFactory(), initialProps: params },
    )
    await waitFor(() => expect(result.current.result.total).toBe(3))
    expect(eventsApi.searchEvents).toHaveBeenCalledWith({ ...params, query: params.query.trim() })

    rerender({ ...params, query: "", type: null, status: null, startFrom: null, startTo: null })
    expect(result.current.enabled).toBe(false)
    expect(result.current.result.items).toEqual([])
    expect(result.current.result.total).toBe(0)
    expect(eventsApi.searchEvents).toHaveBeenCalledTimes(1)
  })

  it("flags an inverted date range instead of sending a search the server rejects", () => {
    const { result } = renderHook(
      () =>
        useEventsSearchQuery({
          query: "", type: null, status: null,
          startFrom: "2026-10-16T00:00:00Z", startTo: "2026-10-10T00:00:00Z",
          page: 0, pageSize: 50,
        }),
      { wrapper: wrapperFactory() },
    )

    expect(result.current.enabled).toBe(true)
    expect(result.current.invalidDateRange).toBe(true)
    expect(result.current.result.items).toEqual([])
    expect(eventsApi.searchEvents).not.toHaveBeenCalled()
  })

  it("does not search when query is shorter than 2 characters", () => {
    const wrapper = wrapperFactory()
    renderHook(
      () =>
        useEventsSearchQuery({
          query: "a",
          type: null,
          status: null,
          startFrom: null,
          startTo: null,
          page: 0,
          pageSize: 50,
        }),
      { wrapper },
    )

    expect(eventsApi.searchEvents).not.toHaveBeenCalled()
  })

  it("searches when query is 2+ chars and returns metadata", async () => {
    vi.mocked(eventsApi.searchEvents).mockResolvedValueOnce({
      items: [],
      total: 8,
      page: 0,
      pageSize: 50,
      hasMore: false,
    })
    const wrapper = wrapperFactory()

    const { result } = renderHook(
      () =>
        useEventsSearchQuery({
          query: "ab",
          type: null,
          status: null,
          startFrom: null,
          startTo: null,
          page: 0,
          pageSize: 50,
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(eventsApi.searchEvents).toHaveBeenCalledWith({
      query: "ab",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 0,
      pageSize: 50,
    })
    expect(result.current.result.total).toBe(8)
  })
})
