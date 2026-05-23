// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
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
    expect(systemRows.find((row) => row.timelineMeta.source === "tournament_start")?.details).toContain("120 Players")
  })

  it("creates and updates note details on root timeblocks", () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Details Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      title: "Reminder",
      sectionType: "note",
      details: "",
      time: "",
    })

    expect(created.details).toBe("")

    const updated = repo.update(created.id, { details: "Updated note body" })
    expect(updated.details).toBe("Updated note body")

    const persisted = testDb.db.select().from(timeblocks).where(eq(timeblocks.id, created.id)).get()
    expect(persisted?.details).toBe("Updated note body")
  })

  it("creates blank setup instructions by default", () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Setup Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "setup_instruction",
    })

    expect(created.title).toBe("")
    expect(created.details).toBe("")
  })

  it("creates setup instructions from section defaults when explicitly requested", () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Prefill Setup Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "setup_instruction",
      prefill: {
        mode: "section_default",
        sectionType: "setup_instruction",
      },
    })

    expect(created.title).toBe("Setup")
    expect(created.details).toBe("Describe what needs to be done...")
  })

  it("applies explicit setup prefill overrides ahead of section defaults", () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Override Setup Event",
      createdAt: new Date().toISOString(),
    }).run()

    const created = repo.insert({
      eventId,
      sectionType: "setup_instruction",
      prefill: {
        mode: "section_default",
        sectionType: "setup_instruction",
        overrides: {
          title: "Room Flip",
          details: "Move chairs and reset linens.",
        },
      },
    })

    expect(created.title).toBe("Room Flip")
    expect(created.details).toBe("Move chairs and reset linens.")
  })

  it("keeps other sections on blank fallback unless explicit values are provided", () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Other Section Event",
      createdAt: new Date().toISOString(),
    }).run()

    const blankVendor = repo.insert({
      eventId,
      sectionType: "vendor",
      prefill: {
        mode: "section_default",
        sectionType: "vendor",
      },
    })

    const explicitVendor = repo.insert({
      eventId,
      sectionType: "vendor",
      title: "Stage Vendor",
      details: "Check power access.",
      prefill: {
        mode: "section_default",
        sectionType: "vendor",
      },
    })

    expect(blankVendor.title).toBe("")
    expect(blankVendor.details).toBeNull()
    expect(explicitVendor.title).toBe("Stage Vendor")
    expect(explicitVendor.details).toBe("Check power access.")
  })

  it("gets timeblocks by event and section type without note/setup satellites", async () => {
    if (!testDb || !repo) throw new Error("Expected test DB to be initialized")

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Section Query Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values([
      {
        id: "tb-note-1",
        eventId,
        title: "Note A",
        time: "",
        details: "Body A",
        sectionType: "note",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tb-setup-1",
        eventId,
        title: "Setup A",
        time: "",
        details: "Setup body",
        sectionType: "setup_instruction",
        createdAt: new Date().toISOString(),
      },
    ]).run()

    const result = await repo.getByEventIdAndSectionType(eventId, "note")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("tb-note-1")
    expect(result[0].details).toBe("Body A")
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
