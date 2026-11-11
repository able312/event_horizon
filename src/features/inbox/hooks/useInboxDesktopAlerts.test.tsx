import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { EventNotification, EventRequest } from "~/definitions/database"
import { eventNotificationKeys, eventRequestKeys } from "~/lib/data/queries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { notifyEventUpdates, notifyNewEventRequest, setInboxBadgeCount } from "~/lib/ipc/eventRequestNotifications"
import { useInboxDesktopAlerts } from "./useInboxDesktopAlerts"

const update = (id: string, read = false) => ({ id, read }) as EventNotification
const request = (id: string) => ({ id }) as EventRequest

vi.mock("~/lib/data/eventRequests", () => ({ getPendingEventRequests: vi.fn(async () => [{ id: "r1" }]) }))
vi.mock("~/lib/data/eventNotifications", () => ({ getInboxEventNotifications: vi.fn(async () => [{ id: "n1", read: false }, { id: "n2", read: true }]) }))
vi.mock("~/lib/ipc/eventRequestNotifications", () => ({
  notifyNewEventRequest: vi.fn(async () => undefined),
  notifyEventUpdates: vi.fn(async () => undefined),
  setInboxBadgeCount: vi.fn(async () => undefined),
}))
afterEach(() => vi.clearAllMocks())

describe("useInboxDesktopAlerts", () => {
  it("badges pending requests plus unread updates, and clears on sign-out", async () => {
    const { queryClient, unmount } = renderHookWithProviders(useInboxDesktopAlerts)
    await waitFor(() => expect(setInboxBadgeCount).toHaveBeenLastCalledWith(2))
    act(() => queryClient.setQueryData(eventNotificationKeys.inbox(), [update("n1", true), update("n2", true)]))
    await waitFor(() => expect(setInboxBadgeCount).toHaveBeenLastCalledWith(1))
    act(() => queryClient.setQueryData(eventRequestKeys.pending(), []))
    await waitFor(() => expect(setInboxBadgeCount).toHaveBeenLastCalledWith(0))
    unmount()
    expect(setInboxBadgeCount).toHaveBeenLastCalledWith(0)
  })

  it("alerts once per batch of new unread updates, but not for those there at startup", async () => {
    const { queryClient } = renderHookWithProviders(useInboxDesktopAlerts)
    await waitFor(() => expect(setInboxBadgeCount).toHaveBeenLastCalledWith(2))
    expect(notifyEventUpdates).not.toHaveBeenCalled()

    act(() => queryClient.setQueryData(eventNotificationKeys.inbox(), [update("n4"), update("n3"), update("n1"), update("n2", true)]))
    await waitFor(() => expect(notifyEventUpdates).toHaveBeenCalledWith(2))
    // A teammate editing the same event again keeps its ID: no second alert
    act(() => queryClient.setQueryData(eventNotificationKeys.inbox(), [update("n4"), update("n3"), update("n1"), update("n2", true)]))
    // Read updates arriving (e.g. Undo of a dismiss) don't alert
    act(() => queryClient.setQueryData(eventNotificationKeys.inbox(), [update("n5", true), update("n4")]))
    expect(notifyEventUpdates).toHaveBeenCalledOnce()

    act(() => queryClient.setQueryData(eventRequestKeys.pending(), [request("r2"), request("r1")]))
    await waitFor(() => expect(notifyNewEventRequest).toHaveBeenCalledOnce())
  })
})
