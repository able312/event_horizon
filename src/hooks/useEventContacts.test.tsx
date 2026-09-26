import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EventContactsPanel } from "~/definitions/contacts"
import * as contactsIpc from "~/lib/ipc/contacts"
import * as eventContactsIpc from "~/lib/ipc/eventContacts"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import { eventContactsQueryKey, useEventContacts } from "./useEventContacts"

vi.mock("~/lib/ipc/eventContacts", () => ({
  getEventContactsPanel: vi.fn(),
  assignEventContact: vi.fn(),
  updateEventContact: vi.fn(),
  setPrimaryEventContact: vi.fn(),
  removeEventContact: vi.fn(),
}))

vi.mock("~/lib/ipc/contacts", () => ({
  updateContact: vi.fn(),
  searchContacts: vi.fn(),
  getContactById: vi.fn(),
}))

vi.mock("~/lib/ipc/vendorCategories", () => ({
  getVendorCategories: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function makePanel(): EventContactsPanel {
  const item = {
    eventContactId: "ec-1",
    contactId: "c-1",
    displayName: "Sarah Kim",
    initials: "SK",
    email: null,
    phone: null,
    roleLabel: null,
    vendorCategory: null,
    isPrimary: false,
    contactArchived: false,
  }
  return {
    eventId: "event-1",
    groups: [
      { role: "client", items: [item] },
      { role: "coordinator", items: [] },
      { role: "vendor", items: [] },
    ],
  }
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useEventContacts", () => {
  it("loads the panel for the event", async () => {
    vi.mocked(eventContactsIpc.getEventContactsPanel).mockResolvedValue(makePanel())

    const { result } = renderHookWithProviders(() => useEventContacts("event-1"))

    await waitFor(() => expect(result.current.data).toEqual(makePanel()))
    expect(eventContactsIpc.getEventContactsPanel).toHaveBeenCalledWith("event-1")
  })

  it("removes optimistically and rolls back when the IPC call fails", async () => {
    vi.mocked(eventContactsIpc.getEventContactsPanel).mockResolvedValue(makePanel())
    const removal = createDeferred<void>()
    vi.mocked(eventContactsIpc.removeEventContact).mockReturnValue(removal.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEventContacts("event-1"))
    await waitFor(() => expect(result.current.data).toBeDefined())

    act(() => result.current.removeContact("ec-1"))

    await waitFor(() => {
      const cached = queryClient.getQueryData<EventContactsPanel>(eventContactsQueryKey("event-1"))
      expect(cached?.groups[0]!.items).toHaveLength(0)
    })

    await act(async () => {
      removal.reject(new Error("db down"))
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<EventContactsPanel>(eventContactsQueryKey("event-1"))
      expect(cached?.groups[0]!.items).toHaveLength(1)
    })
  })

  it("assigns through IPC and refetches the panel", async () => {
    vi.mocked(eventContactsIpc.getEventContactsPanel).mockResolvedValue(makePanel())
    vi.mocked(eventContactsIpc.assignEventContact).mockResolvedValue({} as never)

    const { result } = renderHookWithProviders(() => useEventContacts("event-1"))
    await waitFor(() => expect(result.current.data).toBeDefined())

    await act(async () => {
      await result.current.assignContactAsync({
        target: { contactId: "c-2" },
        role: "vendor",
        opts: { vendorCategoryId: "cat-1" },
      })
    })

    expect(eventContactsIpc.assignEventContact).toHaveBeenCalledWith("event-1", { contactId: "c-2" }, "vendor", {
      vendorCategoryId: "cat-1",
    })
    await waitFor(() => expect(eventContactsIpc.getEventContactsPanel).toHaveBeenCalledTimes(2))
  })

  it("saves contact details before the event assignment", async () => {
    vi.mocked(eventContactsIpc.getEventContactsPanel).mockResolvedValue(makePanel())
    const calls: string[] = []
    vi.mocked(contactsIpc.updateContact).mockImplementation(async () => {
      calls.push("contact")
      return {} as never
    })
    vi.mocked(eventContactsIpc.updateEventContact).mockImplementation(async () => {
      calls.push("assignment")
      return {} as never
    })

    const { result } = renderHookWithProviders(() => useEventContacts("event-1"))

    await act(async () => {
      await result.current.saveContactAsync({
        contactId: "c-1",
        eventContactId: "ec-1",
        contact: { phone: "555" },
        assignment: { roleLabel: "Bride" },
      })
    })

    expect(calls).toEqual(["contact", "assignment"])
    expect(contactsIpc.updateContact).toHaveBeenCalledWith("c-1", { phone: "555" })
    expect(eventContactsIpc.updateEventContact).toHaveBeenCalledWith("ec-1", { roleLabel: "Bride" })
  })
})
