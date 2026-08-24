// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { eq } from "drizzle-orm"

import { beverageItemTimeblocks, beverageItems, events, timeblocks } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createTimeblocksRepository } from "./timeblocks.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("beverage item repository integration", () => {
  let testDb: TestDb | null = null

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    if (!testDb) return
    await testDb.cleanup()
    testDb = null
  })

  it("inserts items without a timeblock and assigns them to multiple timeblocks", async () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const { createBeverageItemsRepository } = await import("./beverageItems.js")
    const repo = createBeverageItemsRepository(testDb.db)
    const timeblocksRepo = createTimeblocksRepository(testDb.db)

    const eventId = uuidv4()
    const timeblockA = uuidv4()
    const timeblockB = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Beverage Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values([
      {
        id: timeblockA,
        eventId,
        title: "Cocktail Hour",
        time: "17:00",
        sectionType: "beverage",
        createdAt: new Date().toISOString(),
      },
      {
        id: timeblockB,
        eventId,
        title: "Dinner Bar",
        time: "19:00",
        sectionType: "beverage",
        createdAt: new Date().toISOString(),
      },
    ]).run()

    const created = repo.insert({
      eventId,
      name: "House White",
      quantity: 10,
      type: "Wine",
      serviceStyle: "Open Bar",
      includes: "Serve chilled",
      unitPriceCents: 1400,
    })

    expect(created.eventId).toBe(eventId)

    repo.setItemTimeblocks(created.id, [timeblockA, timeblockB])

    const fetched = await repo.getByEventId(eventId)

    expect(fetched.timeblocks).toHaveLength(2)
    expect(fetched.items).toEqual([
      expect.objectContaining({
        id: created.id,
        eventId,
        name: "House White",
        quantity: 10,
        type: "Wine",
        assignedTimeblockIds: expect.arrayContaining([timeblockA, timeblockB]),
      }),
    ])

    const timeline = await timeblocksRepo.getAllTimelineBlocks(eventId)
    const cocktailBlock = timeline.find((block) => block.id === timeblockA)
    const dinnerBlock = timeline.find((block) => block.id === timeblockB)

    expect(cocktailBlock?.beverageItems).toEqual([
      expect.objectContaining({ id: created.id, name: "House White" }),
    ])
    expect(dinnerBlock?.beverageItems).toEqual([
      expect.objectContaining({ id: created.id, name: "House White" }),
    ])
  })

  it("uses a client-supplied id when provided and generates one when omitted", async () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const { createBeverageItemsRepository } = await import("./beverageItems.js")
    const repo = createBeverageItemsRepository(testDb.db)

    const eventId = uuidv4()
    const clientId = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Client Id Event",
      createdAt: new Date().toISOString(),
    }).run()

    const withClientId = repo.insert({
      id: clientId,
      eventId,
      name: "Cider",
      type: "Coolers",
    })

    expect(withClientId.id).toBe(clientId)

    const withoutClientId = repo.insert({
      eventId,
      name: "Soda",
      type: "Non-Alcoholic",
    })

    expect(withoutClientId.id).toBeTruthy()
    expect(withoutClientId.id).not.toBe(clientId)
  })

  it("removes assignments but keeps the drink when a timeblock is deleted", async () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const { createBeverageItemsRepository } = await import("./beverageItems.js")
    const repo = createBeverageItemsRepository(testDb.db)

    const eventId = uuidv4()
    const timeblockId = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Cascade Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values({
      id: timeblockId,
      eventId,
      title: "Bar",
      time: "18:00",
      sectionType: "beverage",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      name: "Lager",
      type: "Beer",
      quantity: 24,
    })

    repo.setItemTimeblocks(created.id, [timeblockId])
    testDb.db.delete(timeblocks).where(eq(timeblocks.id, timeblockId)).run()

    const remainingItem = testDb.db.select().from(beverageItems).where(eq(beverageItems.id, created.id)).get()
    expect(remainingItem?.name).toBe("Lager")

    const remainingAssignments = testDb.db.select().from(beverageItemTimeblocks).where(eq(beverageItemTimeblocks.beverageItemId, created.id)).all()
    expect(remainingAssignments).toHaveLength(0)

    const section = await repo.getByEventId(eventId)
    expect(section.items[0]?.assignedTimeblockIds).toEqual([])
  })
})
