// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InferInsertModel } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { getMonthRangeUtcFromLocal } from "../../../lib/months.js"
import { events } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createEventsRepository } from "./events.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

function createEventRecord(overrides: Partial<InferInsertModel<typeof events>> = {}) {
  return {
    id: uuidv4(),
    title: "Repository event",
    type: "function" as const,
    status: "new_lead" as const,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
}

describe("events repository month and unscheduled queries", () => {
  let testDb: TestDb | null = null

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    if (!testDb) return
    await testDb.cleanup()
    testDb = null
  })

  it("getByMonthRange returns only events within the range and orders by startDateTime ASC", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createEventsRepository(testDb.db)
    const range = getMonthRangeUtcFromLocal("2026-04")
    if (!range) throw new Error("Expected valid month range")

    const startMs = Date.parse(range.startInclusiveIso)
    const endMs = Date.parse(range.endExclusiveIso)

    const insideEarly = new Date(startMs + 60 * 60 * 1000).toISOString()
    const insideLate = new Date(startMs + 2 * 60 * 60 * 1000).toISOString()
    const beforeRange = new Date(startMs - 1).toISOString()
    const atEndBoundary = new Date(endMs).toISOString()

    testDb.db.insert(events).values([
      createEventRecord({ title: "Inside Late", startDateTime: insideLate }),
      createEventRecord({ title: "Before Range", startDateTime: beforeRange }),
      createEventRecord({ title: "Inside Early", startDateTime: insideEarly }),
      createEventRecord({ title: "End Boundary", startDateTime: atEndBoundary }),
      createEventRecord({ title: "Unscheduled", startDateTime: null }),
    ]).run()

    const result = repo.getByMonthRange(
      range.startInclusiveIso,
      range.endExclusiveIso,
    )

    expect(result.map((event) => event.title)).toEqual([
      "Inside Early",
      "Inside Late",
    ])
  })

  it("getUnscheduled returns only events with null startDateTime", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createEventsRepository(testDb.db)

    testDb.db.insert(events).values([
      createEventRecord({ title: "Scheduled", startDateTime: "2026-04-10T12:00:00.000Z" }),
      createEventRecord({ title: "Unscheduled 1", startDateTime: null }),
      createEventRecord({ title: "Unscheduled 2", startDateTime: null }),
    ]).run()

    const result = repo.getUnscheduled()

    expect(result).toHaveLength(2)
    expect(result.every((event) => event.startDateTime === null)).toBe(true)
  })

  it("getByCalendarIds returns only events matching the provided calendar IDs", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createEventsRepository(testDb.db)

    testDb.db.insert(events).values([
      createEventRecord({ title: "Match 1", calendarId: "uid-1" }),
      createEventRecord({ title: "Match 2", calendarId: "uid-2" }),
      createEventRecord({ title: "No Match", calendarId: "uid-3" }),
      createEventRecord({ title: "Null Calendar", calendarId: null }),
    ]).run()

    const result = repo.getByCalendarIds(["uid-1", "uid-2"])
    expect(result.map((event) => event.title).sort()).toEqual(["Match 1", "Match 2"])
  })

  it("insertMany inserts multiple records and applies defaults", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createEventsRepository(testDb.db)

    const result = repo.insertMany([
      {
        title: "Imported A",
        calendarId: "uid-A",
        startDateTime: "2026-06-14T17:00:00.000Z",
        endDateTime: "2026-06-14T18:00:00.000Z",
      },
      {
        title: "Imported B",
        calendarId: "uid-B",
        startDateTime: "2026-06-15T17:00:00.000Z",
        endDateTime: "2026-06-15T18:00:00.000Z",
      },
    ])

    expect(result).toHaveLength(2)
    expect(result.every((event) => event.status === "new_lead")).toBe(true)
    expect(result.every((event) => event.type === "function")).toBe(true)
    expect(result.every((event) => typeof event.id === "string" && event.id.length > 0)).toBe(true)
  })

  it("search validates minimum query length", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")
    const repo = createEventsRepository(testDb.db)

    expect(() =>
      repo.search({
        query: "a",
        type: null,
        status: null,
        startFrom: null,
        startTo: null,
        page: 0,
        pageSize: 50,
      }),
    ).toThrow("at least 2 characters")
  })

  it("search matches across title and client fields with relevance ordering", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")
    const repo = createEventsRepository(testDb.db)

    testDb.db.insert(events).values([
      createEventRecord({ id: "e1", title: "Alpha Classic", createdAt: "2026-04-01T00:00:00.000Z" }),
      createEventRecord({ id: "e2", title: "The Alpha Cup", createdAt: "2026-04-02T00:00:00.000Z" }),
      createEventRecord({ id: "e3", title: "Other", clientName: "Alpha Client", createdAt: "2026-04-03T00:00:00.000Z" }),
      createEventRecord({ id: "e4", title: "Other 2", clientEmail: "alpha@example.com", createdAt: "2026-04-04T00:00:00.000Z" }),
    ]).run()

    const result = repo.search({
      query: "alpha",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 0,
      pageSize: 50,
    })

    expect(result.items.map((event) => event.id)).toEqual(["e1", "e2", "e3", "e4"])
  })

  it("search applies type/status AND filters and date range while excluding unscheduled", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")
    const repo = createEventsRepository(testDb.db)

    testDb.db.insert(events).values([
      createEventRecord({
        id: "in-range",
        title: "Alpha Match",
        type: "wedding",
        status: "planning",
        startDateTime: "2026-06-15T10:00:00.000Z",
      }),
      createEventRecord({
        id: "wrong-type",
        title: "Alpha Match",
        type: "function",
        status: "planning",
        startDateTime: "2026-06-15T10:00:00.000Z",
      }),
      createEventRecord({
        id: "unscheduled",
        title: "Alpha Match",
        type: "wedding",
        status: "planning",
        startDateTime: null,
      }),
    ]).run()

    const result = repo.search({
      query: "alpha",
      type: "wedding",
      status: "planning",
      startFrom: "2026-06-01T00:00:00.000Z",
      startTo: "2026-07-01T00:00:00.000Z",
      page: 0,
      pageSize: 50,
    })

    expect(result.items.map((event) => event.id)).toEqual(["in-range"])
  })

  it("search paginates with total and hasMore, and clamps pageSize to 50", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")
    const repo = createEventsRepository(testDb.db)

    const rows = Array.from({ length: 60 }, (_, index) =>
      createEventRecord({
        id: `event-${index + 1}`,
        title: `Alpha ${index + 1}`,
        createdAt: new Date(2026, 3, 1, 0, index, 0, 0).toISOString(),
      }),
    )
    testDb.db.insert(events).values(rows).run()

    const firstPage = repo.search({
      query: "alpha",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 0,
      pageSize: 999,
    })
    const secondPage = repo.search({
      query: "alpha",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 1,
      pageSize: 50,
    })

    expect(firstPage.items).toHaveLength(50)
    expect(firstPage.total).toBe(60)
    expect(firstPage.pageSize).toBe(50)
    expect(firstPage.hasMore).toBe(true)
    expect(secondPage.items).toHaveLength(10)
    expect(secondPage.hasMore).toBe(false)
  })
})
