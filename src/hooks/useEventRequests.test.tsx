import { act, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EventRequest, NewEvent } from "~/definitions/database"
import { ContactsError } from "~/lib/contacts/contactsError"
import * as eventRequestsApi from "~/lib/data/eventRequests"
import { eventRequestKeys } from "~/lib/data/queries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import { useEventRequests } from "./useEventRequests"

vi.mock("~/lib/data/eventRequests", () => ({
  getPendingEventRequests: vi.fn(),
  acceptEventRequest: vi.fn(),
  dismissEventRequest: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

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
})
