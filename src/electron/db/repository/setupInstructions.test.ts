// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { events, setupInstructions, timeblocks } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"
import { createSetupInstructionsRepository } from "./setupInstructions.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("setupInstructions.create", () => {
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

  it("inserts both timeblock and setup instruction on success", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createSetupInstructionsRepository(testDb.db)
    const created = repo.create(eventId)

    expect(created.timeblock.id).toBe(created.setupInstruction.timeblockId)

    const createdSetupInstructions = testDb.db.select().from(setupInstructions).all()
    const createdTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "setup_instruction")
    )).all()

    expect(createdSetupInstructions).toHaveLength(1)
    expect(createdTimeblocks).toHaveLength(1)
  })

  it("rolls back both writes if setup instruction insert fails", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    testDb.sqlite.exec(`
      CREATE TRIGGER fail_setup_instruction_insert
      BEFORE INSERT ON setup_instructions
      BEGIN
        SELECT RAISE(ABORT, 'forced setup_instructions insert failure');
      END;
    `)

    const repo = createSetupInstructionsRepository(testDb.db)

    expect(() => repo.create(eventId)).toThrow("forced setup_instructions insert failure")

    const createdSetupInstructions = testDb.db.select().from(setupInstructions).all()
    const setupInstructionTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "setup_instruction")
    )).all()

    expect(createdSetupInstructions).toHaveLength(0)
    expect(setupInstructionTimeblocks).toHaveLength(0)
  })

  it("rolls back both writes if an error is thrown between inserts", () => {
    if (!testDb) throw new Error("Expected test DB to be initialized")

    const repo = createSetupInstructionsRepository(testDb.db, {
      onAfterTimeblockInsert: () => {
        throw new Error("forced setup_instructions mid-transaction failure")
      },
    })

    expect(() => repo.create(eventId)).toThrow("forced setup_instructions mid-transaction failure")

    const createdSetupInstructions = testDb.db.select().from(setupInstructions).all()
    const setupInstructionTimeblocks = testDb.db.select().from(timeblocks).where(and(
      eq(timeblocks.eventId, eventId),
      eq(timeblocks.sectionType, "setup_instruction")
    )).all()

    expect(createdSetupInstructions).toHaveLength(0)
    expect(setupInstructionTimeblocks).toHaveLength(0)
  })
})
