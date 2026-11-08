import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { resetRememberedFinancialViews, useFinancialView } from "./useFinancialView"

describe("useFinancialView", () => {
  afterEach(() => {
    resetRememberedFinancialViews()
  })

  it("starts on the estimate", () => {
    const { result } = renderHook(() => useFinancialView("evt_1"))
    expect(result.current[0]).toBe("estimate")
  })

  it("remembers the last view for an event after remounting", () => {
    const first = renderHook(() => useFinancialView("evt_1"))
    act(() => first.result.current[1]("invoice"))
    expect(first.result.current[0]).toBe("invoice")
    first.unmount()

    const second = renderHook(() => useFinancialView("evt_1"))
    expect(second.result.current[0]).toBe("invoice")
  })

  it("keeps each event's view separate", () => {
    const { result, rerender } = renderHook(({ eventId }) => useFinancialView(eventId), {
      initialProps: { eventId: "evt_1" },
    })
    act(() => result.current[1]("invoice"))

    rerender({ eventId: "evt_2" })
    expect(result.current[0]).toBe("estimate")

    rerender({ eventId: "evt_1" })
    expect(result.current[0]).toBe("invoice")
  })
})
