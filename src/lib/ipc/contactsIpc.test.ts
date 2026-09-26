import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContactsError } from "~/lib/contacts/contactsError"
import * as contactRolesIpc from "./contactRoles"
import * as contactsIpc from "./contacts"
import * as eventContactsIpc from "./eventContacts"
import * as vendorCategoriesIpc from "./vendorCategories"

type WrapperCase = {
  name: string
  channel: string
  args: unknown[]
  invokeWrapper: (...args: unknown[]) => Promise<unknown>
}

const wrap = (fn: unknown) => fn as (...args: unknown[]) => Promise<unknown>

const wrapperCases: WrapperCase[] = [
  { name: "getContactById", channel: "contacts:get-by-id", args: ["c-1"], invokeWrapper: wrap(contactsIpc.getContactById) },
  { name: "findContactByEmail", channel: "contacts:find-by-email", args: ["a@b.co"], invokeWrapper: wrap(contactsIpc.findContactByEmail) },
  { name: "searchContacts", channel: "contacts:search", args: [{ query: "sa", limit: 20 }], invokeWrapper: wrap(contactsIpc.searchContacts) },
  { name: "createContact", channel: "contacts:post", args: [{ displayName: "Sarah" }], invokeWrapper: wrap(contactsIpc.createContact) },
  { name: "updateContact", channel: "contacts:patch", args: ["c-1", { phone: "1" }], invokeWrapper: wrap(contactsIpc.updateContact) },
  { name: "archiveContact", channel: "contacts:archive", args: ["c-1"], invokeWrapper: wrap(contactsIpc.archiveContact) },
  { name: "restoreContact", channel: "contacts:restore", args: ["c-1"], invokeWrapper: wrap(contactsIpc.restoreContact) },
  { name: "mergeContacts", channel: "contacts:merge", args: ["c-1", "c-2"], invokeWrapper: wrap(contactsIpc.mergeContacts) },
  { name: "deleteContact", channel: "contacts:delete", args: ["c-1"], invokeWrapper: wrap(contactsIpc.deleteContact) },
  { name: "getContactRoles", channel: "contact-roles:get-by-contact-id", args: ["c-1"], invokeWrapper: wrap(contactRolesIpc.getContactRoles) },
  { name: "ensureContactRole", channel: "contact-roles:ensure", args: ["c-1", "vendor", "cat"], invokeWrapper: wrap(contactRolesIpc.ensureContactRole) },
  { name: "removeContactRole", channel: "contact-roles:delete", args: ["c-1", "client", null], invokeWrapper: wrap(contactRolesIpc.removeContactRole) },
  { name: "getVendorCategories", channel: "vendor-categories:get-many", args: [{ includeArchived: true }], invokeWrapper: wrap(vendorCategoriesIpc.getVendorCategories) },
  { name: "createVendorCategory", channel: "vendor-categories:post", args: [{ key: "k", label: "L", colorToken: "red" }], invokeWrapper: wrap(vendorCategoriesIpc.createVendorCategory) },
  { name: "updateVendorCategory", channel: "vendor-categories:patch", args: ["cat", { label: "L" }], invokeWrapper: wrap(vendorCategoriesIpc.updateVendorCategory) },
  { name: "archiveVendorCategory", channel: "vendor-categories:archive", args: ["cat"], invokeWrapper: wrap(vendorCategoriesIpc.archiveVendorCategory) },
  { name: "restoreVendorCategory", channel: "vendor-categories:restore", args: ["cat"], invokeWrapper: wrap(vendorCategoriesIpc.restoreVendorCategory) },
  { name: "getEventContactsPanel", channel: "event-contacts:get-panel", args: ["e-1"], invokeWrapper: wrap(eventContactsIpc.getEventContactsPanel) },
  { name: "assignEventContact", channel: "event-contacts:assign", args: ["e-1", { contactId: "c-1" }, "client", { isPrimary: true }], invokeWrapper: wrap(eventContactsIpc.assignEventContact) },
  { name: "updateEventContact", channel: "event-contacts:patch", args: ["ec-1", { notes: "n" }], invokeWrapper: wrap(eventContactsIpc.updateEventContact) },
  { name: "setPrimaryEventContact", channel: "event-contacts:set-primary", args: ["ec-1"], invokeWrapper: wrap(eventContactsIpc.setPrimaryEventContact) },
  { name: "reorderEventContacts", channel: "event-contacts:reorder", args: ["e-1", "client", ["ec-1"]], invokeWrapper: wrap(eventContactsIpc.reorderEventContacts) },
  { name: "removeEventContact", channel: "event-contacts:delete", args: ["ec-1"], invokeWrapper: wrap(eventContactsIpc.removeEventContact) },
  { name: "getContactEventHistory", channel: "event-contacts:get-by-contact-id", args: ["c-1"], invokeWrapper: wrap(eventContactsIpc.getContactEventHistory) },
  { name: "resolveEventRecipients", channel: "event-contacts:resolve-recipients", args: ["e-1", { roles: ["client"] }], invokeWrapper: wrap(eventContactsIpc.resolveEventRecipients) },
]

describe("contacts renderer IPC wrappers", () => {
  beforeEach(() => {
    vi.mocked(window.electron.ipcRenderer.invoke).mockReset()
  })

  it.each(wrapperCases)("$name invokes $channel and unwraps data", async ({ invokeWrapper, channel, args }) => {
    const invokeMock = vi.mocked(window.electron.ipcRenderer.invoke)
    invokeMock.mockResolvedValueOnce({ ok: true, data: { status: "ok" } })

    await expect(invokeWrapper(...args)).resolves.toEqual({ status: "ok" })
    expect(invokeMock).toHaveBeenCalledWith(channel, ...args)
  })

  it("rejects with a typed ContactsError for error envelopes", async () => {
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce({
      ok: false,
      error: { code: "EmailTaken", message: "taken", existingContactId: "c-9" },
    })

    const error = await contactsIpc.createContact({ displayName: "Sarah" }).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ContactsError)
    expect(error).toMatchObject({ code: "EmailTaken", existingContactId: "c-9" })
  })

  it("passes through unexpected invoke rejections", async () => {
    const invokeError = new Error("ipc failed")
    vi.mocked(window.electron.ipcRenderer.invoke).mockRejectedValueOnce(invokeError)

    await expect(eventContactsIpc.getEventContactsPanel("e-1")).rejects.toBe(invokeError)
  })
})
