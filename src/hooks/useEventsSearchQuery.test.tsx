import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"

import { useEventsSearchQuery } from "./useEventsSearchQuery"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"

vi.mock("~/lib/ipc/ipcEventsQueries", () => ({
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
