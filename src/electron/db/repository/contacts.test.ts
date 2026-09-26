// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { events } from "../schema.js"
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

describe("contacts repository", () => {
  let testDb: TestDb

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  function seedEvent(title = "Event A") {
    const id = uuidv4()
    testDb.db.insert(events).values({ id, title, createdAt: new Date().toISOString() }).run()
    return id
  }

  function categoryId(key: string): string {
    return createVendorCategoriesRepository(testDb.db).list().find((category) => category.key === key)!.id
  }

  it("creates contacts with derived display names and trimmed fields", () => {
    const repo = createContactsRepository(testDb.db)

    const person = repo.create({ firstName: " Sarah ", lastName: "Kim", email: " Sarah@Example.com ", phone: "" })
    expect(person).toMatchObject({
      kind: "individual",
      displayName: "Sarah Kim",
      email: "Sarah@Example.com",
      emailNormalized: "sarah@example.com",
      phone: null,
    })

    const org = repo.create({ kind: "organization", organizationName: "Riverside AV" })
    expect(org.displayName).toBe("Riverside AV")

    expect(() => repo.create({ kind: "organization" })).toThrow(expect.objectContaining({ code: "InvalidInput" }))
    expect(() => repo.create({ displayName: "X", email: "not-an-email" })).toThrow(
      expect.objectContaining({ code: "InvalidInput" }),
    )
  })

  it("rejects duplicate active emails with EmailTaken carrying the existing id", () => {
    const repo = createContactsRepository(testDb.db)
    const sarah = repo.create({ displayName: "Sarah Kim", email: "sarah@example.com" })

    expect(() => repo.create({ displayName: "Sarah K", email: " SARAH@example.com" })).toThrow(
      expect.objectContaining({ code: "EmailTaken", existingContactId: sarah.id }),
    )
    expect(repo.findByEmail("SARAH@EXAMPLE.COM ")?.id).toBe(sarah.id)

    // Archived contacts release their email, and can't be restored while it's taken
    repo.archive(sarah.id)
    expect(repo.findByEmail("sarah@example.com")).toBeNull()
    expect(repo.getById(sarah.id)?.archivedAt).not.toBeNull()
    const replacement = repo.create({ displayName: "New Sarah", email: "sarah@example.com" })
    expect(() => repo.restore(sarah.id)).toThrow(
      expect.objectContaining({ code: "EmailTaken", existingContactId: replacement.id }),
    )
  })

  it("updates contacts, re-checking email and re-deriving default display names only", () => {
    const repo = createContactsRepository(testDb.db)
    const taken = repo.create({ displayName: "Taken", email: "taken@example.com" })
    const sarah = repo.create({ firstName: "Sarah", lastName: "Kim" })

    expect(repo.update(sarah.id, { lastName: "Lee" }).displayName).toBe("Sarah Lee")
    expect(repo.update(sarah.id, { displayName: "Chef Sarah" }).displayName).toBe("Chef Sarah")
    expect(repo.update(sarah.id, { lastName: "Park" }).displayName).toBe("Chef Sarah")

    expect(() => repo.update(sarah.id, { email: "Taken@example.com" })).toThrow(
      expect.objectContaining({ code: "EmailTaken", existingContactId: taken.id }),
    )
    const updated = repo.update(sarah.id, { email: "sarah@example.com" })
    expect(updated.emailNormalized).toBe("sarah@example.com")
    expect(updated.updatedAt >= sarah.updatedAt).toBe(true)
  })

  it("searches by name, email and standing role with cursor paging", () => {
    const repo = createContactsRepository(testDb.db)
    const roles = createContactRolesRepository(testDb.db)

    const caterer = repo.create({ displayName: "Sarah Kim", email: "sarah@feast.com" })
    roles.ensure(caterer.id, "vendor", categoryId("catering"))
    const dj = repo.create({ displayName: "DJ Mo" })
    roles.ensure(dj.id, "vendor", categoryId("music"))
    const client = repo.create({ kind: "organization", organizationName: "Acme 100% Co" })
    roles.ensure(client.id, "client")
    const archived = repo.create({ displayName: "Sarah Old" })
    repo.archive(archived.id)

    expect(repo.search({ query: "sarah", limit: 10 }).items.map((c) => c.id)).toEqual([caterer.id])
    expect(repo.search({ query: "sarah", includeArchived: true, limit: 10 }).items).toHaveLength(2)
    expect(repo.search({ query: "FEAST", limit: 10 }).items.map((c) => c.id)).toEqual([caterer.id])
    expect(repo.search({ query: "100%", limit: 10 }).items.map((c) => c.id)).toEqual([client.id])

    const vendors = repo.search({ role: "vendor", limit: 10 })
    expect(vendors.items.map((c) => c.displayName)).toEqual(["DJ Mo", "Sarah Kim"])
    expect(vendors.items[1]!.roles).toEqual([
      expect.objectContaining({ role: "vendor", vendorCategory: expect.objectContaining({ label: "Catering" }) }),
    ])

    const music = repo.search({ vendorCategoryId: categoryId("music"), limit: 10 })
    expect(music.items.map((c) => c.id)).toEqual([dj.id])

    const firstPage = repo.search({ limit: 2 })
    expect(firstPage.items).toHaveLength(2)
    expect(firstPage.nextCursor).not.toBeNull()
    const secondPage = repo.search({ limit: 2, cursor: firstPage.nextCursor })
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.nextCursor).toBeNull()
  })

  it("only hard-deletes contacts with no assignment history", () => {
    const repo = createContactsRepository(testDb.db)
    const eventContacts = createEventContactsRepository(testDb.db)
    const eventId = seedEvent()

    const unused = repo.create({ displayName: "Unused" })
    createContactRolesRepository(testDb.db).ensure(unused.id, "client")
    repo.delete(unused.id)
    expect(repo.getById(unused.id)).toBeNull()

    const used = repo.create({ displayName: "Used" })
    const assignment = eventContacts.assign(eventId, { contactId: used.id }, "client")
    eventContacts.remove(assignment.id)
    expect(() => repo.delete(used.id)).toThrow(expect.objectContaining({ code: "ContactInUse" }))
  })

  it("merges a duplicate into the target: roles unioned, assignments repointed, source archived", () => {
    const repo = createContactsRepository(testDb.db)
    const roles = createContactRolesRepository(testDb.db)
    const eventContacts = createEventContactsRepository(testDb.db)
    const eventA = seedEvent("Event A")
    const eventB = seedEvent("Event B")
    const catering = categoryId("catering")

    const target = repo.create({ displayName: "Sarah Kim" })
    const source = repo.create({ displayName: "S. Kim", email: "sarah@example.com", phone: "555-0100" })

    eventContacts.assign(eventA, { contactId: target.id }, "vendor", { vendorCategoryId: catering })
    eventContacts.assign(eventA, { contactId: source.id }, "vendor", {
      vendorCategoryId: catering,
      roleLabel: "Head chef",
      isPrimary: true,
    })
    eventContacts.assign(eventB, { contactId: source.id }, "client")

    const merged = repo.merge(source.id, target.id)

    expect(merged).toMatchObject({ id: target.id, email: "sarah@example.com", phone: "555-0100" })
    expect(repo.getById(source.id)?.archivedAt).not.toBeNull()
    expect(roles.listForContact(source.id)).toHaveLength(0)
    expect(roles.listForContact(target.id).map((role) => role.role).sort()).toEqual(["client", "vendor"])

    const panelA = eventContacts.getPanel(eventA)
    const vendorsA = panelA.groups.find((group) => group.role === "vendor")!.items
    expect(vendorsA).toHaveLength(1)
    expect(vendorsA[0]).toMatchObject({ contactId: target.id, isPrimary: true, roleLabel: "Head chef" })

    const clientsB = eventContacts.getPanel(eventB).groups.find((group) => group.role === "client")!.items
    expect(clientsB.map((item) => item.contactId)).toEqual([target.id])

    expect(() => repo.merge(target.id, target.id)).toThrow(expect.objectContaining({ code: "InvalidInput" }))
  })
})
