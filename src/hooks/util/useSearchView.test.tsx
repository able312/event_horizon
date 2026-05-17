import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"

import { useSearchView } from "./useSearchView"

type Person = { fname: string; lname: string }

describe("useSearchView", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty results when data is undefined", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSearchView<Person>(undefined, ""))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual({ parsedList: [], total: 0 })
  })

  it("returns empty results when data is an empty array", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSearchView<Person>([], ""))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual({ parsedList: [], total: 0 })
  })

  it("filters by full name case-insensitively", () => {
    vi.useFakeTimers()

    const data: Person[] = [
      { fname: "John", lname: "Smith" },
      { fname: "Jane", lname: "Doe" },
    ]

    const { result } = renderHook(() => useSearchView<Person>(data, "joHN smi"))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.parsedList).toEqual([{ fname: "John", lname: "Smith" }])
    expect(result.current.total).toBe(1)
  })
})

