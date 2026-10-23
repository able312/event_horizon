import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { EventRequest } from "~/definitions/database"
import { eventRequestKeys } from "~/lib/data/queries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { notifyNewEventRequest, setPendingRequestCount } from "~/lib/ipc/eventRequestNotifications"
import { useEventRequestNotifications } from "./useEventRequestNotifications"

vi.mock("~/lib/data/eventRequests", () => ({ getPendingEventRequests: vi.fn(async () => [{ id: "a" }]) }))
vi.mock("~/lib/ipc/eventRequestNotifications", () => ({
  notifyNewEventRequest: vi.fn(async () => undefined),
  setPendingRequestCount: vi.fn(async () => undefined),
}))
afterEach(() => vi.clearAllMocks())
const request = (id: string) => ({ id }) as EventRequest

describe("useEventRequestNotifications", () => {
  it("baselines startup, groups arrivals, tracks badge changes and clears on sign-out", async () => {
    const { queryClient, unmount, rerender } = renderHookWithProviders(useEventRequestNotifications)
    await waitFor(() => expect(setPendingRequestCount).toHaveBeenCalledWith(1))
    expect(notifyNewEventRequest).not.toHaveBeenCalled()
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), [request("b"), request("c")]))
    await waitFor(() => expect(notifyNewEventRequest).toHaveBeenCalledOnce())
    expect(setPendingRequestCount).toHaveBeenLastCalledWith(2)
    rerender()
    expect(notifyNewEventRequest).toHaveBeenCalledOnce()
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), []))
    await waitFor(() => expect(setPendingRequestCount).toHaveBeenLastCalledWith(0))
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), [request("a"), request("b")]))
    await waitFor(() => expect(setPendingRequestCount).toHaveBeenLastCalledWith(2))
    expect(notifyNewEventRequest).toHaveBeenCalledOnce()
    unmount()
    expect(setPendingRequestCount).toHaveBeenLastCalledWith(0)
  })
})
