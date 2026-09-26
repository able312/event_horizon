// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContactsError } from "../../lib/contacts/contactsError.js"

const handleMock = vi.fn()

const contactQueries = {
  getById: vi.fn(),
  findByEmail: vi.fn(),
  search: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
  merge: vi.fn(),
  delete: vi.fn(),
}
const contactRoleQueries = { listForContact: vi.fn(), ensure: vi.fn(), remove: vi.fn() }
const vendorCategoryQueries = { list: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn() }
const eventContactQueries = {
  getPanel: vi.fn(),
  assign: vi.fn(),
  update: vi.fn(),
  setPrimary: vi.fn(),
  reorder: vi.fn(),
  remove: vi.fn(),
  listEventsForContact: vi.fn(),
  resolveRecipients: vi.fn(),
}

vi.mock("electron", () => ({ ipcMain: { handle: handleMock } }))
vi.mock("../db/repository/contacts.js", () => ({ default: contactQueries }))
vi.mock("../db/repository/contactRoles.js", () => ({ default: contactRoleQueries }))
vi.mock("../db/repository/vendorCategories.js", () => ({ default: vendorCategoryQueries }))
vi.mock("../db/repository/eventContacts.js", () => ({ default: eventContactQueries }))

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

async function registerAll() {
  const { registerContactsIpcHandlers } = await import("./contactsHandler.js")
  const { registerContactRolesIpcHandlers } = await import("./contactRolesHandler.js")
  const { registerVendorCategoriesIpcHandlers } = await import("./vendorCategoriesHandler.js")
  const { registerEventContactsIpcHandlers } = await import("./eventContactsHandler.js")
  registerContactsIpcHandlers()
  registerContactRolesIpcHandlers()
  registerVendorCategoriesIpcHandlers()
  registerEventContactsIpcHandlers()
}

function handlerFor(channel: string): Handler {
  const handler = handleMock.mock.calls.find((entry) => entry[0] === channel)?.[1]
  if (!handler) throw new Error(`No handler registered for ${channel}`)
  return handler as Handler
}

describe("contacts IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers every channel and each is allowlisted in preload", async () => {
    await registerAll()
    const channels = handleMock.mock.calls.map((entry) => entry[0] as string)
    expect(channels).toHaveLength(25)

    const preloadSource = readFileSync(join(process.cwd(), "src/electron/preload.cts"), "utf8")
    for (const channel of channels) expect(preloadSource).toContain(`"${channel}"`)
  })

  it("routes arguments to the repositories and wraps results", async () => {
    await registerAll()

    eventContactQueries.assign.mockReturnValueOnce({ id: "ec-1" })
    await expect(
      handlerFor("event-contacts:assign")({}, "event-1", { contactId: "c-1" }, "vendor", { vendorCategoryId: "cat" }),
    ).resolves.toEqual({ ok: true, data: { id: "ec-1" } })
    expect(eventContactQueries.assign).toHaveBeenCalledWith("event-1", { contactId: "c-1" }, "vendor", {
      vendorCategoryId: "cat",
    })

    contactQueries.merge.mockReturnValueOnce({ id: "target" })
    await expect(handlerFor("contacts:merge")({}, "source", "target")).resolves.toEqual({
      ok: true,
      data: { id: "target" },
    })
    expect(contactQueries.merge).toHaveBeenCalledWith("source", "target")

    await handlerFor("contact-roles:ensure")({}, "c-1", "vendor", "cat")
    expect(contactRoleQueries.ensure).toHaveBeenCalledWith("c-1", "vendor", "cat")

    await handlerFor("vendor-categories:get-many")({}, { includeArchived: true })
    expect(vendorCategoryQueries.list).toHaveBeenCalledWith({ includeArchived: true })

    await handlerFor("event-contacts:resolve-recipients")({}, "event-1", { roles: ["client"] })
    expect(eventContactQueries.resolveRecipients).toHaveBeenCalledWith("event-1", { roles: ["client"] })
  })

  it("returns ContactsErrors as values so EmailTaken keeps its existing contact id", async () => {
    await registerAll()
    contactQueries.create.mockImplementationOnce(() => {
      throw new ContactsError("EmailTaken", "taken", "existing-1")
    })

    await expect(handlerFor("contacts:post")({}, { email: "x@example.com" })).resolves.toEqual({
      ok: false,
      error: { code: "EmailTaken", message: "taken", existingContactId: "existing-1" },
    })
  })

  it("logs and rethrows unexpected errors", async () => {
    await registerAll()
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    eventContactQueries.getPanel.mockImplementationOnce(() => {
      throw new Error("disk I/O error")
    })

    await expect(handlerFor("event-contacts:get-panel")({}, "event-1")).rejects.toThrow("disk I/O error")
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
