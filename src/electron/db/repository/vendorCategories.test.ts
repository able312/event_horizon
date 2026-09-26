// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createTestDb, type TestDb } from "../test/testDb.js"
import { createContactRolesRepository } from "./contactRoles.js"
import { createContactsRepository } from "./contacts.js"
import { createVendorCategoriesRepository, DEFAULT_VENDOR_CATEGORIES } from "./vendorCategories.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("vendor categories repository", () => {
  let testDb: TestDb

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  it("lists seeded categories in sort order and hides archived ones by default", () => {
    const repo = createVendorCategoriesRepository(testDb.db)
    const keys = repo.list().map((category) => category.key)
    expect(keys).toEqual(DEFAULT_VENDOR_CATEGORIES.map((category) => category.key))

    const music = repo.list().find((category) => category.key === "music")!
    repo.archive(music.id)
    expect(repo.list().some((category) => category.id === music.id)).toBe(false)
    expect(repo.list({ includeArchived: true }).some((category) => category.id === music.id)).toBe(true)

    repo.restore(music.id)
    expect(repo.list().some((category) => category.id === music.id)).toBe(true)
  })

  it("creates and updates categories, rejecting duplicate keys", () => {
    const repo = createVendorCategoriesRepository(testDb.db)
    const created = repo.create({ key: "Bakery", label: " Bakery ", colorToken: "orange", sortOrder: 90 })
    expect(created).toMatchObject({ key: "bakery", label: "Bakery", colorToken: "orange", sortOrder: 90 })

    expect(() => repo.create({ key: "bakery", label: "Again", colorToken: "red" })).toThrow(/already exists/)
    expect(() => repo.create({ key: "bad key!", label: "x", colorToken: "red" })).toThrow(/a-z/)

    const renamed = repo.update(created.id, { key: "cakes", label: "Cakes" })
    expect(renamed).toMatchObject({ key: "cakes", label: "Cakes" })
  })

  it("makes the key immutable once the category is in use", () => {
    const repo = createVendorCategoriesRepository(testDb.db)
    const category = repo.create({ key: "bakery", label: "Bakery", colorToken: "orange" })
    const contact = createContactsRepository(testDb.db).create({ displayName: "Crumbs" })
    createContactRolesRepository(testDb.db).ensure(contact.id, "vendor", category.id)

    expect(() => repo.update(category.id, { key: "cakes" })).toThrow(/can't change/)
    expect(repo.update(category.id, { label: "Bakery & Cakes" }).label).toBe("Bakery & Cakes")
  })

  it("seeds defaults idempotently", () => {
    const repo = createVendorCategoriesRepository(testDb.db)
    repo.seedDefaults()
    repo.seedDefaults()
    expect(repo.list({ includeArchived: true })).toHaveLength(DEFAULT_VENDOR_CATEGORIES.length)
  })
})
