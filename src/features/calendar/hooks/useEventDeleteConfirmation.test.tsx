import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useEventDeleteConfirmation } from "./useEventDeleteConfirmation"

describe("useEventDeleteConfirmation", () => {
  it("opens confirmation when deletion is requested", () => {
    const deleteEvent = vi.fn(async () => true)
    const { result } = renderHook(() => useEventDeleteConfirmation(deleteEvent))

    act(() => {
      result.current.requestDelete("event-1")
    })

    expect(result.current.pendingEventId).toBe("event-1")
    expect(result.current.isOpen).toBe(true)
  })

  it("cancels confirmation without deleting", () => {
    const deleteEvent = vi.fn(async () => true)
    const { result } = renderHook(() => useEventDeleteConfirmation(deleteEvent))

    act(() => {
      result.current.requestDelete("event-1")
      result.current.cancelDelete()
    })

    expect(result.current.pendingEventId).toBeNull()
    expect(result.current.isOpen).toBe(false)
    expect(deleteEvent).not.toHaveBeenCalled()
  })

  it("confirms and deletes selected event", async () => {
    const deleteEvent = vi.fn(async () => true)
    const { result } = renderHook(() => useEventDeleteConfirmation(deleteEvent))

    act(() => {
      result.current.requestDelete("event-1")
    })

    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteEvent).toHaveBeenCalledWith("event-1")
    expect(result.current.pendingEventId).toBeNull()
    expect(result.current.isOpen).toBe(false)
  })

  it("closes dialog even when deletion fails", async () => {
    const deleteEvent = vi.fn(async () => {
      throw new Error("delete failed")
    })
    const { result } = renderHook(() => useEventDeleteConfirmation(deleteEvent))

    act(() => {
      result.current.requestDelete("event-1")
    })

    await act(async () => {
      await result.current.confirmDelete()
    })

    await waitFor(() => {
      expect(result.current.pendingEventId).toBeNull()
      expect(result.current.isOpen).toBe(false)
    })
  })
})
