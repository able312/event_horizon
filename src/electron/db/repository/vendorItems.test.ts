// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { events, timeblocks, vendorItems } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createVendorItemsRepository } from "./vendorItems.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("vendorItems.create", () => {
  let testDb: TestDb | null = null
  let eventId = ""

  beforeEach(async () => {
    testDb = await createTestDb()
    eventId = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Rollback Test Event",
      createdAt: new Date().toISOString(),
    }).run()
  })

  afterEach(async () => {
    if (!testDb) return
    await testDb.cleanup()
    testDb = null
  })

  it("inserts both timeblock and vendor row on success", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createVendorItemsRepository(testDb.db)
    const created = repo.create(eventId)

    expect(created.timeblock.id).toBe(created.vendor.timeblockId)

    const createdVendors = testDb.db.select().from(vendorItems).all()
    const createdTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "vendor")
    )).all()

    expect(createdVendors).toHaveLength(1)
    expect(createdTimeblocks).toHaveLength(1)
  })

  it("rolls back both writes if vendor insert fails", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    testDb.sqlite.exec(`
      CREATE TRIGGER fail_vendor_insert
      BEFORE INSERT ON vendor_items
      BEGIN
        SELECT RAISE(ABORT, 'forced vendor_items insert failure');
      END;
    `)

    const repo = createVendorItemsRepository(testDb.db)

    expect(() => repo.create(eventId)).toThrow("forced vendor_items insert failure")

    const createdVendors = testDb.db.select().from(vendorItems).all()
    const vendorTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "vendor")
    )).all()

    expect(createdVendors).toHaveLength(0)
    expect(vendorTimeblocks).toHaveLength(0)
  })

  it("rolls back both writes if an error is thrown between inserts", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createVendorItemsRepository(testDb.db, {
      onAfterTimeblockInsert: () => {
        throw new Error("forced vendor_items mid-transaction failure")
      },
    })

    expect(() => repo.create(eventId)).toThrow("forced vendor_items mid-transaction failure")

    const createdVendors = testDb.db.select().from(vendorItems).all()
    const vendorTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "vendor")
    )).all()

    expect(createdVendors).toHaveLength(0)
    expect(vendorTimeblocks).toHaveLength(0)
  })

  it("fetches vendor timeblocks with nested vendorItem", async () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createVendorItemsRepository(testDb.db)
    const created = repo.create(eventId)

    const fetched = await repo.getByEventId(eventId)

    expect(fetched).toHaveLength(1)
    expect(fetched[0]?.id).toBe(created.timeblock.id)
    expect(fetched[0]?.vendorItem).toEqual(
      expect.objectContaining({
        id: created.vendor.id,
        timeblockId: created.timeblock.id,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      }),
    )
  })

  it("enforces a one-to-one vendor row per timeblock", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createVendorItemsRepository(testDb.db)
    const created = repo.create(eventId)

    expect(() => {
      testDb!.db.insert(vendorItems).values({
        id: uuidv4(),
        timeblockId: created.timeblock.id,
        contactName: "Duplicate",
        contactPhone: "",
        contactEmail: "",
      }).run()
    }).toThrow(/UNIQUE constraint failed: vendor_items\.timeblock_id/)
  })
})
