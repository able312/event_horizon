// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { contacts, events } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createContactRolesRepository } from "./contactRoles.js"
import { createContactsRepository } from "./contacts.js"
import { createEventContactsRepository } from "./eventContacts.js"
import { createVendorCategoriesRepository } from "./vendorCategories.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("event contacts repository", () => {
  let testDb: TestDb

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  function seedEvent(title: string, startDateTime: string | null = null) {
    const id = uuidv4()
    testDb.db.insert(events).values({ id, title, startDateTime, createdAt: new Date().toISOString() }).run()
    return id
  }

  function categoryId(key: string): string {
    return createVendorCategoriesRepository(testDb.db).list().find((category) => category.key === key)!.id
  }

  function repos() {
    return {
      contacts: createContactsRepository(testDb.db),
      roles: createContactRolesRepository(testDb.db),
      eventContacts: createEventContactsRepository(testDb.db),
    }
  }

  function groupItems(eventId: string, role: "client" | "coordinator" | "vendor") {
    return repos().eventContacts.getPanel(eventId).groups.find((group) => group.role === role)!.items
  }

  it("returns all three groups in fixed order for an empty event, and NotFound for a missing one", () => {
    const eventId = seedEvent("Empty")
    const panel = repos().eventContacts.getPanel(eventId)
    expect(panel).toEqual({
      eventId,
      groups: [
        { role: "client", items: [] },
        { role: "coordinator", items: [] },
        { role: "vendor", items: [] },
      ],
    })
    expect(() => repos().eventContacts.getPanel("missing")).toThrow(expect.objectContaining({ code: "NotFound" }))
  })

  it("new caterer on Event A: creates contact, standing role and assignment", () => {
    const { roles, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const catering = categoryId("catering")

    const assignment = eventContacts.assign(
      eventA,
      { newContact: { firstName: "Sarah", lastName: "Kim", email: "sarah@feast.com" } },
      "vendor",
      { vendorCategoryId: catering, roleLabel: "Head chef" },
    )

    expect(roles.listForContact(assignment.contactId)).toEqual([
      expect.objectContaining({ role: "vendor", vendorCategoryId: catering }),
    ])
    expect(groupItems(eventA, "vendor")).toEqual([
      {
        eventContactId: assignment.id,
        contactId: assignment.contactId,
        displayName: "Sarah Kim",
        initials: "SK",
        email: "sarah@feast.com",
        phone: null,
        roleLabel: "Head chef",
        vendorCategory: { id: catering, label: "Catering", colorToken: "teal" },
        isPrimary: false,
        contactArchived: false,
      },
    ])
  })

  it("caterer books us for her own party: same contact, extra client role, no bleed across events", () => {
    const { roles, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const eventB = seedEvent("Event B")

    const vendorRow = eventContacts.assign(eventA, { newContact: { displayName: "Sarah Kim" } }, "vendor", {
      vendorCategoryId: categoryId("catering"),
    })
    eventContacts.assign(eventB, { contactId: vendorRow.contactId }, "client")

    expect(roles.listForContact(vendorRow.contactId).map((role) => role.role).sort()).toEqual(["client", "vendor"])
    expect(groupItems(eventA, "client")).toHaveLength(0)
    expect(groupItems(eventA, "vendor")).toHaveLength(1)
    expect(groupItems(eventB, "client")).toHaveLength(1)
    expect(groupItems(eventB, "vendor")).toHaveLength(0)
  })

  it("DJ who also supplies lighting appears twice on one event", () => {
    const { roles, eventContacts } = repos()
    const eventA = seedEvent("Event A")

    const music = eventContacts.assign(eventA, { newContact: { displayName: "DJ Mo" } }, "vendor", {
      vendorCategoryId: categoryId("music"),
    })
    eventContacts.assign(eventA, { contactId: music.contactId }, "vendor", { vendorCategoryId: categoryId("rentals") })

    expect(roles.listForContact(music.contactId)).toHaveLength(2)
    expect(groupItems(eventA, "vendor").map((item) => item.vendorCategory?.label)).toEqual(["Music", "Rentals"])
  })

  it("removing keeps the standing role; re-assigning re-activates the same row", () => {
    const { roles, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const catering = categoryId("catering")

    const row = eventContacts.assign(eventA, { newContact: { displayName: "Sarah Kim" } }, "vendor", {
      vendorCategoryId: catering,
      roleLabel: "Head chef",
    })
    expect(() =>
      eventContacts.assign(eventA, { contactId: row.contactId }, "vendor", { vendorCategoryId: catering }),
    ).toThrow(expect.objectContaining({ code: "DuplicateAssignment" }))

    eventContacts.remove(row.id)
    expect(groupItems(eventA, "vendor")).toHaveLength(0)
    expect(roles.listForContact(row.contactId)).toHaveLength(1)

    const again = eventContacts.assign(eventA, { contactId: row.contactId }, "vendor", { vendorCategoryId: catering })
    expect(again.id).toBe(row.id)
    expect(again.removedAt).toBeNull()
    expect(again.roleLabel).toBe("Head chef")
  })

  it("rejects bad role/category pairs, archived categories and archived contacts", () => {
    const { contacts: contactsRepo, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const contact = contactsRepo.create({ displayName: "Someone" })

    expect(() => eventContacts.assign(eventA, { contactId: contact.id }, "vendor")).toThrow(
      expect.objectContaining({ code: "InvalidRoleCategory" }),
    )
    expect(() =>
      eventContacts.assign(eventA, { contactId: contact.id }, "client", { vendorCategoryId: categoryId("music") }),
    ).toThrow(expect.objectContaining({ code: "InvalidRoleCategory" }))

    const florals = categoryId("florals")
    createVendorCategoriesRepository(testDb.db).archive(florals)
    expect(() =>
      eventContacts.assign(eventA, { contactId: contact.id }, "vendor", { vendorCategoryId: florals }),
    ).toThrow(expect.objectContaining({ code: "InvalidRoleCategory" }))

    contactsRepo.archive(contact.id)
    expect(() => eventContacts.assign(eventA, { contactId: contact.id }, "client")).toThrow(
      expect.objectContaining({ code: "ContactArchived" }),
    )
  })

  it("does not create a contact when an inline new contact can't be assigned", () => {
    const { contacts: contactsRepo, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const existing = contactsRepo.create({ displayName: "Sarah", email: "sarah@example.com" })

    expect(() =>
      eventContacts.assign(eventA, { newContact: { displayName: "Sarah 2", email: "SARAH@example.com" } }, "client"),
    ).toThrow(expect.objectContaining({ code: "EmailTaken", existingContactId: existing.id }))

    expect(() =>
      eventContacts.assign(eventA, { newContact: { displayName: "Vendor w/o category" } }, "vendor"),
    ).toThrow(expect.objectContaining({ code: "InvalidRoleCategory" }))
    expect(testDb.db.select().from(contacts).all()).toHaveLength(1)
  })

  it("flags archived contacts on existing assignments", () => {
    const { contacts: contactsRepo, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const row = eventContacts.assign(eventA, { newContact: { displayName: "Old Client" } }, "client")
    contactsRepo.archive(row.contactId)

    expect(groupItems(eventA, "client")[0]).toMatchObject({ contactArchived: true })
  })

  it("keeps one primary per event and role, and sorts primary first then sort order", () => {
    const { eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const eventB = seedEvent("Event B")

    const alice = eventContacts.assign(eventA, { newContact: { displayName: "Alice" } }, "coordinator")
    const bob = eventContacts.assign(eventA, { newContact: { displayName: "Bob" } }, "coordinator", { isPrimary: true })
    const client = eventContacts.assign(eventA, { newContact: { displayName: "Cara" } }, "client", { isPrimary: true })
    const other = eventContacts.assign(eventB, { contactId: alice.contactId }, "coordinator", { isPrimary: true })

    expect(groupItems(eventA, "coordinator").map((item) => item.displayName)).toEqual(["Bob", "Alice"])

    eventContacts.setPrimary(alice.id)
    const coordinators = groupItems(eventA, "coordinator")
    expect(coordinators.map((item) => [item.displayName, item.isPrimary])).toEqual([
      ["Alice", true],
      ["Bob", false],
    ])
    // Other roles and other events are untouched
    expect(groupItems(eventA, "client")[0]).toMatchObject({ eventContactId: client.id, isPrimary: true })
    expect(groupItems(eventB, "coordinator")[0]).toMatchObject({ eventContactId: other.id, isPrimary: true })

    eventContacts.update(bob.id, { isPrimary: true })
    expect(groupItems(eventA, "coordinator").filter((item) => item.isPrimary).map((i) => i.displayName)).toEqual([
      "Bob",
    ])
  })

  it("reorders a role group and validates the id list", () => {
    const { eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const a = eventContacts.assign(eventA, { newContact: { displayName: "A" } }, "client")
    const b = eventContacts.assign(eventA, { newContact: { displayName: "B" } }, "client")
    const c = eventContacts.assign(eventA, { newContact: { displayName: "C" } }, "client")

    eventContacts.reorder(eventA, "client", [c.id, a.id, b.id])
    expect(groupItems(eventA, "client").map((item) => item.displayName)).toEqual(["C", "A", "B"])

    expect(() => eventContacts.reorder(eventA, "client", [c.id, a.id])).toThrow(
      expect.objectContaining({ code: "InvalidInput" }),
    )
  })

  it("updates label, notes and category, ensuring the new standing role", () => {
    const { roles, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const music = categoryId("music")
    const rentals = categoryId("rentals")

    const row = eventContacts.assign(eventA, { newContact: { displayName: "DJ Mo" } }, "vendor", {
      vendorCategoryId: music,
    })
    const updated = eventContacts.update(row.id, { vendorCategoryId: rentals, roleLabel: " Lighting ", notes: "" })
    expect(updated).toMatchObject({ vendorCategoryId: rentals, roleLabel: "Lighting", notes: null })
    expect(roles.listForContact(row.contactId).map((role) => role.vendorCategoryId).sort()).toEqual(
      [music, rentals].sort(),
    )

    expect(() => eventContacts.update(row.id, { vendorCategoryId: null })).toThrow(
      expect.objectContaining({ code: "InvalidRoleCategory" }),
    )

    eventContacts.assign(eventA, { contactId: row.contactId }, "vendor", { vendorCategoryId: music })
    expect(() => eventContacts.update(row.id, { vendorCategoryId: music })).toThrow(
      expect.objectContaining({ code: "DuplicateAssignment" }),
    )
  })

  it("lists a contact's event history newest first, including removed assignments", () => {
    const { eventContacts } = repos()
    const older = seedEvent("Spring Gala", "2026-04-01T18:00:00.000Z")
    const newer = seedEvent("Autumn Wedding", "2026-10-01T18:00:00.000Z")

    const first = eventContacts.assign(older, { newContact: { displayName: "Sarah" } }, "vendor", {
      vendorCategoryId: categoryId("catering"),
    })
    const second = eventContacts.assign(newer, { contactId: first.contactId }, "client")
    eventContacts.remove(first.id)

    const history = eventContacts.listEventsForContact(first.contactId)
    expect(history.map((entry) => entry.eventTitle)).toEqual(["Autumn Wedding", "Spring Gala"])
    expect(history[0]).toMatchObject({ eventContactId: second.id, role: "client", vendorCategory: null, removedAt: null })
    expect(history[1]).toMatchObject({
      role: "vendor",
      vendorCategory: expect.objectContaining({ label: "Catering" }),
      removedAt: expect.any(String),
    })
  })

  it("resolves recipients from rows or whole groups, de-duplicated and skipping missing emails", () => {
    const { contacts: contactsRepo, eventContacts } = repos()
    const eventA = seedEvent("Event A")
    const catering = categoryId("catering")
    const music = categoryId("music")

    const client = eventContacts.assign(
      eventA,
      { newContact: { displayName: "Cara Client", email: "cara@example.com" } },
      "client",
    )
    const noEmail = eventContacts.assign(eventA, { newContact: { displayName: "No Email" } }, "client")
    const chef = eventContacts.assign(
      eventA,
      { newContact: { displayName: "Chef", email: "chef@example.com" } },
      "vendor",
      { vendorCategoryId: catering },
    )
    // Same contact in two categories: one email
    eventContacts.assign(eventA, { contactId: chef.contactId }, "vendor", { vendorCategoryId: music })
    const dj = eventContacts.assign(eventA, { newContact: { displayName: "DJ", email: "dj@example.com" } }, "vendor", {
      vendorCategoryId: music,
    })
    const removed = eventContacts.assign(
      eventA,
      { newContact: { displayName: "Gone", email: "gone@example.com" } },
      "coordinator",
    )
    eventContacts.remove(removed.id)
    contactsRepo.create({ displayName: "Not on event", email: "other@example.com" })

    const everyone = eventContacts.resolveRecipients(eventA, { roles: ["client", "coordinator", "vendor"] })
    expect(everyone.recipients.map((r) => r.email)).toEqual(["cara@example.com", "chef@example.com", "dj@example.com"])
    expect(everyone.skipped).toEqual([{ contactId: noEmail.contactId, displayName: "No Email" }])

    const musicOnly = eventContacts.resolveRecipients(eventA, { roles: ["vendor"], vendorCategoryIds: [music] })
    expect(musicOnly.recipients.map((r) => r.email)).toEqual(["chef@example.com", "dj@example.com"])

    const picked = eventContacts.resolveRecipients(eventA, { eventContactIds: [dj.id, client.id, removed.id] })
    expect(picked.recipients.map((r) => r.displayName)).toEqual(["Cara Client", "DJ"])

    expect(() =>
      eventContacts.resolveRecipients(eventA, {} as { roles: [] }),
    ).toThrow(expect.objectContaining({ code: "InvalidInput" }))
  })
})
