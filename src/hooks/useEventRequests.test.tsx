import { act, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EventRequest, NewEvent } from "~/definitions/database"
import { ContactsError } from "~/lib/contacts/contactsError"
import { BackendError } from "~/lib/data/backend"
import * as eventRequestsApi from "~/lib/data/eventRequests"
import { eventRequestKeys } from "~/lib/data/queries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import { DISMISS_UNDO_MS, useEventRequests } from "./useEventRequests"

vi.mock("~/lib/data/eventRequests", () => ({
  getPendingEventRequests: vi.fn(),
  acceptEventRequest: vi.fn(),
  dismissEventRequest: vi.fn(),
  restoreEventRequest: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

const first = { id: "req-1" } as EventRequest
const second = { id: "req-2" } as EventRequest
const newEvent = { id: "", title: "Smith Wedding", createdAt: "" } as NewEvent
const client = { newContact: { firstName: "Jane" } }

afterEach(() => vi.clearAllMocks())

describe("useEventRequests", () => {
  it("lists pending requests", async () => {
    vi.mocked(eventRequestsApi.getPendingEventRequests).mockResolvedValue([first, second])
    const { result } = renderHookWithProviders(() => useEventRequests())
    await waitFor(() => expect(result.current.requests).toEqual([first, second]))
  })

  it("hides a dismissed request right away and puts it back if the dismiss fails", async () => {
    vi.mocked(eventRequestsApi.getPendingEventRequests).mockResolvedValue([first, second])
    let rejectDismiss: (err: Error) => void = () => undefined
    vi.mocked(eventRequestsApi.dismissEventRequest).mockReturnValue(new Promise((_resolve, reject) => { rejectDismiss = reject }))
    const { result, queryClient } = renderHookWithProviders(() => useEventRequests())
    await waitFor(() => expect(result.current.requests).toHaveLength(2))

    act(() => result.current.dismissRequest("req-1"))
    await waitFor(() => expect(queryClient.getQueryData(eventRequestKeys.pending())).toEqual([second]))

    await act(async () => rejectDismiss(new Error("offline")))
    await waitFor(() => expect(queryClient.getQueryData(eventRequestKeys.pending())).toEqual([first, second]))
    expect(toast.error).toHaveBeenCalledWith("Failed to dismiss request")
  })

  it("offers Undo after a dismiss, which restores the request", async () => {
    vi.mocked(eventRequestsApi.getPendingEventRequests).mockResolvedValue([first])
    vi.mocked(eventRequestsApi.dismissEventRequest).mockResolvedValue()
    vi.mocked(eventRequestsApi.restoreEventRequest).mockResolvedValue()
    const { result } = renderHookWithProviders(() => useEventRequests())
    await waitFor(() => expect(result.current.requests).toHaveLength(1))

    act(() => result.current.dismissRequest("req-1"))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Request dismissed", expect.objectContaining({ duration: DISMISS_UNDO_MS })))

    const undo = vi.mocked(toast).mock.calls[0]![1]!.action as unknown as { onClick: () => void }
    act(() => undo.onClick())
    await waitFor(() => expect(eventRequestsApi.restoreEventRequest).toHaveBeenCalledWith("req-1"))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("leaves a taken email to the review form but reports other accept failures", async () => {
    vi.mocked(eventRequestsApi.getPendingEventRequests).mockResolvedValue([first])
    const { result } = renderHookWithProviders(() => useEventRequests())

    vi.mocked(eventRequestsApi.acceptEventRequest).mockRejectedValueOnce(new ContactsError("EmailTaken", "Email taken", "c-1"))
    await act(async () => { await expect(result.current.acceptRequest("req-1", newEvent, client)).rejects.toThrow("Email taken") })
    expect(toast.error).not.toHaveBeenCalled()

    vi.mocked(eventRequestsApi.acceptEventRequest).mockRejectedValueOnce(new Error("This request was already accepted"))
    await act(async () => { await expect(result.current.acceptRequest("req-1", newEvent, client)).rejects.toThrow() })
    expect(toast.error).toHaveBeenCalledWith("Failed to accept request")
    expect(eventRequestsApi.acceptEventRequest).toHaveBeenLastCalledWith("req-1", newEvent, client)
  })

  it("says when a teammate already reviewed the request", async () => {
    vi.mocked(eventRequestsApi.getPendingEventRequests).mockResolvedValue([first])
    const { result } = renderHookWithProviders(() => useEventRequests())
    await waitFor(() => expect(result.current.requests).toHaveLength(1))

    vi.mocked(eventRequestsApi.acceptEventRequest).mockRejectedValueOnce(new BackendError("AlreadyReviewed", "This request was already dismissed"))
    await act(async () => { await expect(result.current.acceptRequest("req-1", newEvent, client)).rejects.toThrow() })
    expect(toast.error).toHaveBeenLastCalledWith("This request was already dismissed")

    vi.mocked(eventRequestsApi.dismissEventRequest).mockRejectedValueOnce(new BackendError("AlreadyReviewed", "This request was already accepted"))
    act(() => result.current.dismissRequest("req-1"))
    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("This request was already accepted"))
  })
})
