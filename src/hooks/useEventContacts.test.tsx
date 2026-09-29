import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Contact, EventContactsPanel } from "~/definitions/contacts"
import { ContactsError } from "~/lib/contacts/contactsError"
import * as contactsIpc from "~/lib/ipc/contacts"
import * as eventContactsIpc from "~/lib/ipc/eventContacts"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import {
  eventContactsQueryKey,
  PRIMARY_CLIENTS_QUERY_KEY_PREFIX,
  useArchiveContact,
  useContactSearch,
  useCreateContact,
  useDeleteContact,
  useEventContacts,
  useUpdateContact,
} from "./useEventContacts"

vi.mock("~/lib/ipc/eventContacts", () => ({
  getEventContactsPanel: vi.fn(),
  assignEventContact: vi.fn(),
  updateEventContact: vi.fn(),
  setPrimaryEventContact: vi.fn(),
  removeEventContact: vi.fn(),
  getContactEventHistory: vi.fn(),
  getPrimaryClients: vi.fn(),
}))

vi.mock("~/lib/ipc/contacts", () => ({
  createContact: vi.fn(),
  updateContact: vi.fn(),
  archiveContact: vi.fn(),
  restoreContact: vi.fn(),
  deleteContact: vi.fn(),
  searchContacts: vi.fn(),
  getContactById: vi.fn(),
}))

vi.mock("~/lib/ipc/contactRoles", () => ({
  getContactRoles: vi.fn(),
  ensureContactRole: vi.fn(),
  removeContactRole: vi.fn(),
}))

vi.mock("~/lib/ipc/vendorCategories", () => ({
  getVendorCategories: vi.fn(),
}))

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c-1",
    kind: "individual",
    firstName: "Sarah",
    lastName: "Kim",
    organizationName: null,
    displayName: "Sarah Kim",
    email: "sarah@example.com",
    emailNormalized: "sarah@example.com",
    phone: null,
    notes: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

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

describe("useContactSearch", () => {
  it("passes role and includeArchived filters through to searchContacts", async () => {
    vi.mocked(contactsIpc.searchContacts).mockResolvedValue({ items: [], nextCursor: null })

    const { result } = renderHookWithProviders(() =>
      useContactSearch("sarah", true, { role: "vendor", includeArchived: true }),
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(contactsIpc.searchContacts).toHaveBeenCalledWith(
      expect.objectContaining({ query: "sarah", role: "vendor", includeArchived: true }),
    )
  })
})

describe("useCreateContact", () => {
  it("creates a contact and returns it", async () => {
    const created = makeContact()
    vi.mocked(contactsIpc.createContact).mockResolvedValue(created)

    const { result } = renderHookWithProviders(() => useCreateContact())

    let returned: Contact | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({ firstName: "Sarah", lastName: "Kim" })
    })

    expect(returned).toEqual(created)
  })
})

describe("useUpdateContact / useArchiveContact", () => {
  it("invalidates both the contacts directory and every event-contacts panel on update", async () => {
    vi.mocked(contactsIpc.updateContact).mockResolvedValue(makeContact({ displayName: "Sarah K." }))
    vi.mocked(eventContactsIpc.getEventContactsPanel).mockResolvedValue(makePanel())

    const { result, queryClient } = renderHookWithProviders(() => ({
      update: useUpdateContact(),
      panel: useEventContacts("event-1"),
    }))
    await waitFor(() => expect(result.current.panel.data).toBeDefined())

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await act(async () => {
      await result.current.update.mutateAsync({ id: "c-1", patch: { firstName: "Sarah" } })
    })

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(["contacts"])
    expect(invalidatedKeys).toContainEqual(["event-contacts"])
  })

  it("surfaces archive failures as a toast", async () => {
    vi.mocked(contactsIpc.archiveContact).mockRejectedValue(new Error("boom"))

    const { result } = renderHookWithProviders(() => useArchiveContact())

    act(() => {
      result.current.mutate("c-1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe("useDeleteContact", () => {
  it("rejects with ContactInUse so the page can show a specific message", async () => {
    vi.mocked(contactsIpc.deleteContact).mockRejectedValue(
      new ContactsError("ContactInUse", "This contact is on an event and can't be deleted"),
    )

    const { result } = renderHookWithProviders(() => useDeleteContact())

    let error: unknown
    await act(async () => {
      try {
        await result.current.mutateAsync("c-1")
      } catch (err) {
        error = err
      }
    })

    expect(error).toBeInstanceOf(ContactsError)
    expect((error as ContactsError).code).toBe("ContactInUse")
  })
})

describe("PRIMARY_CLIENTS_QUERY_KEY_PREFIX", () => {
  it("shares the event-contacts root, so a full-cache invalidation covers it too", () => {
    expect(PRIMARY_CLIENTS_QUERY_KEY_PREFIX[0]).toBe("event-contacts")
  })
})
