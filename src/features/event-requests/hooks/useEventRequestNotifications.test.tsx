import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { EventRequest } from "~/definitions/database"
import { eventRequestKeys } from "~/lib/data/queries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { notifyNewEventRequest } from "~/lib/ipc/eventRequestNotifications"
import { getPendingEventRequests } from "~/lib/data/eventRequests"
import { useEventRequestNotifications } from "./useEventRequestNotifications"

vi.mock("~/lib/data/eventRequests", () => ({ getPendingEventRequests: vi.fn(async () => [{ id: "a" }]) }))
vi.mock("~/lib/ipc/eventRequestNotifications", () => ({ notifyNewEventRequest: vi.fn(async () => undefined) }))
afterEach(() => vi.clearAllMocks())
const request = (id: string) => ({ id }) as EventRequest

describe("useEventRequestNotifications", () => {
  it("baselines startup, groups arrivals and doesn't re-alert after Undo", async () => {
    const { queryClient, rerender } = renderHookWithProviders(useEventRequestNotifications)
    await waitFor(() => expect(getPendingEventRequests).toHaveBeenCalled())
    await waitFor(() => expect(queryClient.getQueryData(eventRequestKeys.pending())).toHaveLength(1))
    expect(notifyNewEventRequest).not.toHaveBeenCalled()
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), [request("b"), request("c")]))
    await waitFor(() => expect(notifyNewEventRequest).toHaveBeenCalledOnce())
    rerender()
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), []))
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), [request("a"), request("b")]))
    expect(notifyNewEventRequest).toHaveBeenCalledOnce()
  })
})
