import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"

import { useEventsQueryState } from "./useEventsQueryState"

let latestSearch = ""

function LocationProbe() {
  const location = useLocation()
  latestSearch = location.search
  return null
}

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/events"
            element={
              <>
                <LocationProbe />
                {children}
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )
  }
}

describe("useEventsQueryState", () => {
  beforeEach(() => {
    latestSearch = ""
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("applies defaults and canonicalizes an empty query string", async () => {
    const { result } = renderHook(() => useEventsQueryState(), {
      wrapper: createWrapper("/events"),
    })

    expect(result.current.state.view).toBe("calendar")
    expect(result.current.state.date).toMatch(/^\d{4}-\d{2}$/)
    expect(result.current.state.search).toBeNull()
    expect(result.current.state.type).toBeNull()
    expect(result.current.state.status).toBeNull()

    await waitFor(() => {
      expect(latestSearch).toBe(`?date=${result.current.state.date}`)
    })
  })

  it("sanitizes and normalizes incoming params", async () => {
    const { result } = renderHook(() => useEventsQueryState(), {
      wrapper: createWrapper(
        "/events?view=bogus&date=2026-4&search=%20%20abc%20%20&type=bad&status=planning",
      ),
    })

    expect(result.current.state.view).toBe("calendar")
    expect(result.current.state.date).toBe("2026-04")
    expect(result.current.state.search).toBe("abc")
    expect(result.current.state.type).toBeNull()
    expect(result.current.state.status).toBe("planning")

    await waitFor(() => {
      expect(latestSearch).toBe(
        "?date=2026-04&search=abc&status=planning",
      )
    })
  })

  it("updates query state through setters and reset", async () => {
    const { result } = renderHook(() => useEventsQueryState(), {
      wrapper: createWrapper("/events?date=2026-04"),
    })

    await waitFor(() => {
      expect(latestSearch).toBe("?date=2026-04")
    })

    act(() => {
      result.current.setDate("2027-1")
    })
    await waitFor(() => {
      expect(latestSearch).toBe("?date=2027-01")
    })

    act(() => {
      result.current.setType("wedding")
    })
    await waitFor(() => {
      expect(latestSearch).toBe("?date=2027-01&type=wedding")
    })

    act(() => {
      result.current.setStatus("closed")
    })
    await waitFor(() => {
      expect(latestSearch).toBe(
        "?date=2027-01&type=wedding&status=closed",
      )
    })

    act(() => {
      result.current.setSearch("  vip  ")
    })
    await waitFor(() => {
      expect(latestSearch).toBe(
        "?date=2027-01&search=vip&type=wedding&status=closed",
      )
    })

    act(() => {
      result.current.reset()
    })

    await waitFor(() => {
      expect(latestSearch).toBe(`?date=${result.current.state.date}`)
    })
    expect(result.current.state.search).toBeNull()
    expect(result.current.state.type).toBeNull()
    expect(result.current.state.status).toBeNull()
  })

  it("debounces search input before committing to URL", async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useEventsQueryState(), {
      wrapper: createWrapper("/events?date=2026-04"),
    })

    expect(latestSearch).toBe("?date=2026-04")

    act(() => {
      result.current.setSearchInput("abc")
    })
    expect(result.current.searchInput).toBe("abc")
    expect(latestSearch).toBe("?date=2026-04")

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(latestSearch).toBe("?date=2026-04")

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(latestSearch).toBe("?date=2026-04&search=abc")

    act(() => {
      result.current.setSearchInput("   ")
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(latestSearch).toBe("?date=2026-04")
  })
})
