// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { cartDetails, events, timeblocks, tournamentDetails } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createTimeblocksRepository } from "./timeblocks.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("timeblocks.getAllTimelineBlocks", () => {
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

  it("returns persisted timeline rows sorted by time, title, and id", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Sorted Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values([
      {
        id: "timeblock-c",
        eventId,
        title: "Ceremony",
        time: "10:00",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "timeblock-a",
        eventId,
        title: "Arrival",
        time: "09:00",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "timeblock-b",
        eventId,
        title: "Ceremony",
        time: "10:00",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
    ]).run()

    const result = await repo.getAllTimelineBlocks(eventId)

    expect(result.map((row) => row.id)).toEqual(["timeblock-a", "timeblock-b", "timeblock-c"])
    expect(result.every((row) => row.timelineMeta.source === "timeblock")).toBe(true)
    expect(result.every((row) => row.timelineMeta.isSystem === false)).toBe(true)
    expect(result.every((row) => row.timelineMeta.isEditable === true)).toBe(true)
  })

  it("excludes null, blank, and malformed time values", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Validation Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values([
      {
        id: "valid",
        eventId,
        title: "Valid",
        time: "11:30",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "blank",
        eventId,
        title: "Blank",
        time: "",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "spaces",
        eventId,
        title: "Spaces",
        time: "   ",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "malformed-hours",
        eventId,
        title: "Malformed Hours",
        time: "24:00",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "malformed-format",
        eventId,
        title: "Malformed Format",
        time: "9:00",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "malformed-minutes",
        eventId,
        title: "Malformed Minutes",
        time: "10:7",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "null-time",
        eventId,
        title: "Null",
        time: null,
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
    ]).run()

    const result = await repo.getAllTimelineBlocks(eventId)

    expect(result.map((row) => row.id)).toEqual(["valid"])
  })

  it("includes only valid system timeline rows and marks them read-only", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Tournament Event",
      type: "tournament",
      startDateTime: "2026-06-01T07:15:00",
      endDateTime: "not-a-date",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(tournamentDetails).values({
      id: uuidv4(),
      eventId,
      time: "09:00",
      paceOfPlay: "04:30",
      numberOfPlayers: 120,
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(cartDetails).values({
      id: uuidv4(),
      eventId,
      time: "13:45",
      createdAt: new Date().toISOString(),
    }).run()

    const result = await repo.getAllTimelineBlocks(eventId)
    const systemRows = result.filter((row) => row.timelineMeta.isSystem)

    expect(systemRows.map((row) => row.timelineMeta.source)).toEqual([
      "event_start",
      "tournament_start",
      "tournament_end",
      "cart_detail",
    ])
    expect(systemRows.every((row) => row.timelineMeta.isEditable === false)).toBe(true)
    expect(systemRows.every((row) => row.timelineMeta.isSystem === true)).toBe(true)
  })

  it("throws when eventId is missing", async () => {
    if (!repo) throw new Error("Expected repository to be initialized")

    await expect(repo.getAllTimelineBlocks("")).rejects.toThrow("getAllTimelineBlocks: eventId is required")
  })

  it("throws when the event does not exist", async () => {
    if (!repo) throw new Error("Expected repository to be initialized")

    await expect(repo.getAllTimelineBlocks("missing-event-id")).rejects.toThrow("Event not found for id missing-event-id")
  })
})
