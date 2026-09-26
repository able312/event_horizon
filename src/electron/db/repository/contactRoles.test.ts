// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createTestDb, type TestDb } from "../test/testDb.js"
import { createContactRolesRepository } from "./contactRoles.js"
import { createContactsRepository } from "./contacts.js"
import { createVendorCategoriesRepository } from "./vendorCategories.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("contact roles repository", () => {
  let testDb: TestDb

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  function categoryId(key: string): string {
    return createVendorCategoriesRepository(testDb.db).list().find((category) => category.key === key)!.id
  }

  it("ensure is idempotent and supports several vendor categories per contact", () => {
    const roles = createContactRolesRepository(testDb.db)
    const dj = createContactsRepository(testDb.db).create({ firstName: "DJ", lastName: "Mo" })

    const music = roles.ensure(dj.id, "vendor", categoryId("music"))
    expect(roles.ensure(dj.id, "vendor", categoryId("music")).id).toBe(music.id)
    roles.ensure(dj.id, "vendor", categoryId("rentals"))
    roles.ensure(dj.id, "client")

    expect(roles.listForContact(dj.id)).toHaveLength(3)

    roles.remove(dj.id, "vendor", categoryId("rentals"))
    expect(roles.listForContact(dj.id).map((role) => role.vendorCategoryId)).not.toContain(categoryId("rentals"))
  })

  it("validates the role/category pairing, contact and archived categories", () => {
    const roles = createContactRolesRepository(testDb.db)
    const contact = createContactsRepository(testDb.db).create({ displayName: "Sarah Kim" })

    expect(() => roles.ensure(contact.id, "vendor")).toThrow(expect.objectContaining({ code: "InvalidRoleCategory" }))
    expect(() => roles.ensure(contact.id, "client", categoryId("music"))).toThrow(
      expect.objectContaining({ code: "InvalidRoleCategory" }),
    )
    expect(() => roles.ensure("missing", "client")).toThrow(expect.objectContaining({ code: "NotFound" }))

    const florals = categoryId("florals")
    createVendorCategoriesRepository(testDb.db).archive(florals)
    expect(() => roles.ensure(contact.id, "vendor", florals)).toThrow(
      expect.objectContaining({ code: "InvalidRoleCategory" }),
    )
  })
})
