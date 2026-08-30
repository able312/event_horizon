// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { events, foodItems, timeblocks } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createTimeblocksRepository } from "./timeblocks.js"
import { createSqliteConnection } from "../factory.js"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("timeblocks conversion + foreign keys", () => {
  let testDb: TestDb | null = null
  let repo: ReturnType<typeof createTimeblocksRepository> | null = null

  beforeEach(async () => {
    testDb = await createTestDb()
    repo = createTimeblocksRepository(testDb.db)
  })

  afterEach(async () => {
    if (!testDb) return
    await testDb.cleanup()
    testDb = null
    repo = null
  })

  it("enables foreign keys on every new sqlite connection", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "event-horizon-fk-"))
    const sqlite = createSqliteConnection(join(tempDir, "fk.sqlite"))
    try {
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1)
    } finally {
      sqlite.close()
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it("converts note to food without deleting root fields", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Conversion Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "note",
      title: "Dinner notes",
      details: "Guest prefers early seating",
      time: "18:00",
    })

    const result = repo.convertSectionType({
      timeblockId: created.id,
      toType: "food",
    })

    expect(result.timeblock.sectionType).toBe("food")
    expect(result.timeblock.title).toBe("Dinner notes")
    expect(result.timeblock.details).toBe("Guest prefers early seating")
    expect(result.timeblock.time).toBe("18:00")
    expect(result.impact.requiresConfirmation).toBe(false)
  })

  it("refuses destructive food conversion without confirmation", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Food Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "food",
      title: "Dinner",
      details: "Kitchen overview",
    })

    testDb.db.insert(foodItems).values({
      id: uuidv4(),
      timeblockId: created.id,
      name: "Steak",
      quantity: 40,
      serviceStyle: "Plated",
      includes: "Medium rare",
      unitPriceCents: 4500,
    }).run()

    expect(() =>
      repo!.convertSectionType({
        timeblockId: created.id,
        toType: "note",
      }),
    ).toThrow(/confirmDestructive=true/)

    const remaining = testDb.db.select().from(foodItems).where(eq(foodItems.timeblockId, created.id)).all()
    expect(remaining).toHaveLength(1)
  })

  it("deletes food items when converting food to note with confirmation", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Food Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "food",
      title: "Dinner",
      details: "Kitchen overview",
      time: "19:00",
    })

    testDb.db.insert(foodItems).values([
      {
        id: uuidv4(),
        timeblockId: created.id,
        name: "Steak",
        quantity: 40,
        serviceStyle: "Plated",
        includes: "Medium rare",
        unitPriceCents: 4500,
      },
      {
        id: uuidv4(),
        timeblockId: created.id,
        name: "Salad",
        quantity: 40,
        serviceStyle: "Plated",
        includes: null,
        unitPriceCents: 1200,
      },
    ]).run()

    const result = repo.convertSectionType({
      timeblockId: created.id,
      toType: "note",
      confirmDestructive: true,
    })

    expect(result.timeblock.sectionType).toBe("note")
    expect(result.timeblock.title).toBe("Dinner")
    expect(result.timeblock.details).toBe("Kitchen overview")
    expect(result.timeblock.time).toBe("19:00")
    expect(result.impact.deletedItemCount).toBe(2)

    const remaining = testDb.db.select().from(foodItems).where(eq(foodItems.timeblockId, created.id)).all()
    expect(remaining).toHaveLength(0)

    const persisted = testDb.db.select().from(timeblocks).where(eq(timeblocks.id, created.id)).get()
    expect(persisted?.sectionType).toBe("note")
  })

  it("cascades food item deletes when a timeblock is deleted with foreign keys on", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Cascade Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "food",
      title: "Lunch",
    })

    testDb.db.insert(foodItems).values({
      id: uuidv4(),
      timeblockId: created.id,
      name: "Soup",
    }).run()

    expect(repo.delete(created.id)).toBe(true)
    const remaining = testDb.db.select().from(foodItems).where(eq(foodItems.timeblockId, created.id)).all()
    expect(remaining).toHaveLength(0)
  })

  it("inspects conversion impact without mutating", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Inspect Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "food",
      title: "Brunch",
    })

    testDb.db.insert(foodItems).values({
      id: uuidv4(),
      timeblockId: created.id,
      name: "Eggs",
    }).run()

    const impact = await repo.inspectConversion({
      timeblockId: created.id,
      toType: "setup_instruction",
    })

    expect(impact.requiresConfirmation).toBe(true)
    expect(impact.deletedItemCount).toBe(1)

    const stillFood = testDb.db.select().from(timeblocks).where(eq(timeblocks.id, created.id)).get()
    expect(stillFood?.sectionType).toBe("food")
  })
})
