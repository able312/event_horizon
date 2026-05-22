// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { events, timeblocks } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"

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

  it("inserts and fetches beverage items under beverageItems", async () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const { createBeverageItemsRepository } = await import("./beverageItems.js")
    const repo = createBeverageItemsRepository(testDb.db)

    const eventId = uuidv4()
    const timeblockId = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Beverage Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values({
      id: timeblockId,
      eventId,
      title: "Cocktail Hour",
      time: "17:00",
      sectionType: "beverage",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      timeblockId,
      name: "House White",
      quantity: 10,
      type: "Wine",
      serviceStyle: "Open Bar",
      includes: "Serve chilled",
      unitPriceCents: 1400,
    })

    expect(created.timeblockId).toBe(timeblockId)

    const fetched = await repo.getByEventId(eventId)

    expect(fetched).toHaveLength(1)
    expect(fetched[0]?.beverageItems).toEqual([
      expect.objectContaining({
        id: created.id,
        timeblockId,
        name: "House White",
        quantity: 10,
        type: "Wine",
        serviceStyle: "Open Bar",
        includes: "Serve chilled",
        unitPriceCents: 1400,
      }),
    ])
  })
})
