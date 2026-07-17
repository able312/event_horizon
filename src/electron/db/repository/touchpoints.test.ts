// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { events } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createTouchpointsRepository } from "./touchpoints.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("touchpoints repository", () => {
  let testDb: TestDb | null = null

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    if (!testDb) return
    await testDb.cleanup()
    testDb = null
  })

  function seedEvent(startDateTime = "2026-07-25T12:00:00.000Z") {
    if (!testDb) throw new Error("Expected test DB")
    const eventId = uuidv4()
    testDb.db
      .insert(events)
      .values({
        id: eventId,
        title: "Touchpoint Event",
        startDateTime,
        createdAt: new Date().toISOString(),
      })
      .run()
    return eventId
  }

  it("inserts, lists, updates, and deletes touchpoints for an event", () => {
    if (!testDb) throw new Error("Expected test DB")
    const repo = createTouchpointsRepository(testDb.db)
    const eventId = seedEvent()

    const created = repo.insert(eventId, {
      title: "Final guest count",
      dueDate: "2026-07-18T00:00:00.000Z",
    })

    expect(created.eventId).toBe(eventId)
    expect(created.completedAt).toBeNull()

    const listed = repo.getByEventId(eventId)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.title).toBe("Final guest count")

    const updated = repo.update(created.id, {
      completedAt: "2026-07-10T15:00:00.000Z",
    })
    expect(updated.completedAt).toBe("2026-07-10T15:00:00.000Z")

    expect(repo.getIncompleteByEventId(eventId)).toHaveLength(0)

    expect(repo.delete(created.id)).toBe(true)
    expect(repo.getByEventId(eventId)).toHaveLength(0)
  })

  it("seeds three common touchpoints and lists incomplete with event title", () => {
    if (!testDb) throw new Error("Expected test DB")
    const repo = createTouchpointsRepository(testDb.db)
    const eventId = seedEvent("2026-07-25T12:00:00.000Z")

    const seeded = repo.seedCommon(eventId)
    expect(seeded).toHaveLength(3)

    const incomplete = repo.getIncompleteWithEvent()
    expect(incomplete.length).toBeGreaterThanOrEqual(3)
    expect(
      incomplete.some((row) => row.eventId === eventId && row.eventTitle === "Touchpoint Event"),
    ).toBe(true)
  })
})
