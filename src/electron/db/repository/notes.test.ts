// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { notes, events, timeblocks } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createNotesRepository } from "./notes.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("notes.create", () => {
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

  it("inserts both timeblock and note on success", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createNotesRepository(testDb.db)
    const created = repo.create(eventId)

    expect(created.timeblock.id).toBe(created.note.timeblockId)

    const createdNotes = testDb.db.select().from(notes).all()
    const createdTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "note")
    )).all()

    expect(createdNotes).toHaveLength(1)
    expect(createdTimeblocks).toHaveLength(1)
  })

  it("rolls back both writes if notes insert fails", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    testDb.sqlite.exec(`
      CREATE TRIGGER fail_notes_insert
      BEFORE INSERT ON notes
      BEGIN
        SELECT RAISE(ABORT, 'forced notes insert failure');
      END;
    `)

    const repo = createNotesRepository(testDb.db)

    expect(() => repo.create(eventId)).toThrow("forced notes insert failure")

    const createdNotes = testDb.db.select().from(notes).all()
    const noteTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "note")
    )).all()

    expect(createdNotes).toHaveLength(0)
    expect(noteTimeblocks).toHaveLength(0)
  })

  it("rolls back both writes if an error is thrown between inserts", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createNotesRepository(testDb.db, {
      onAfterTimeblockInsert: () => {
        throw new Error("forced notes mid-transaction failure")
      },
    })

    expect(() => repo.create(eventId)).toThrow("forced notes mid-transaction failure")

    const createdNotes = testDb.db.select().from(notes).all()
    const noteTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "note")
    )).all()

    expect(createdNotes).toHaveLength(0)
    expect(noteTimeblocks).toHaveLength(0)
  })
})
