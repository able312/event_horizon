// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { runMigrations } from "../factory.js"
import { createTouchpointsRepository } from "../repository/touchpoints.js"
import { events, payments } from "../schema.js"
import { createTestDb, type TestDb } from "../test/testDb.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

const migrationsFolder = join(process.cwd(), "migrations/drizzle")

type JournalEntry = {
  idx: number
  tag: string
}

type Journal = {
  entries: JournalEntry[]
}

async function createPreTouchpointsMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-touchpoints-migration-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const touchpointsEntry = journal.entries.find((entry) => entry.tag === "0016_touchpoints")
  if (!touchpointsEntry) {
    throw new Error("Expected 0016_touchpoints migration entry")
  }

  journal.entries = journal.entries.filter((entry) => entry.idx < touchpointsEntry.idx)
  await writeFile(journalPath, JSON.stringify(journal, null, 2))

  await rm(join(tempMigrationsFolder, `${touchpointsEntry.tag}.sql`), { force: true })
  await rm(join(tempMigrationsFolder, "meta", `${String(touchpointsEntry.idx).padStart(4, "0")}_snapshot.json`), {
    force: true,
  })

  return {
    tempRoot,
    tempMigrationsFolder,
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true })
    },
  }
}

function tableCount(sqlite: TestDb["sqlite"], table: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
  return row.count
}

describe("0016_touchpoints migration", () => {
  let testDb: TestDb | null = null
  let tempMigrationCleanup: (() => Promise<void>) | null = null

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup()
      testDb = null
    }
    if (tempMigrationCleanup) {
      await tempMigrationCleanup()
      tempMigrationCleanup = null
    }
  })

  it("adds the touchpoints table without modifying existing rows", async () => {
    const preMigration = await createPreTouchpointsMigrationsFolder()
    tempMigrationCleanup = preMigration.cleanup

    testDb = await createTestDb({ migrationsFolder: preMigration.tempMigrationsFolder })

    const eventId = uuidv4()
    const paymentId = uuidv4()
    const createdAt = new Date().toISOString()

    testDb.db
      .insert(events)
      .values({
        id: eventId,
        title: "Pre-migration event",
        startDateTime: "2026-08-12T18:30:00.000Z",
        endDateTime: "2026-08-12T21:00:00.000Z",
        internalNotes: "Keep this note",
        createdAt,
      })
      .run()

    testDb.db
      .insert(payments)
      .values({
        id: paymentId,
        eventId,
        amountCents: 50000,
        date: "2026-08-01T00:00:00.000Z",
        createdAt,
      })
      .run()

    const eventsBefore = tableCount(testDb.sqlite, "events")
    const paymentsBefore = tableCount(testDb.sqlite, "payments")

    expect(
      testDb.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'touchpoints'")
        .get(),
    ).toBeUndefined()

    runMigrations(testDb.db, migrationsFolder)

    expect(tableCount(testDb.sqlite, "events")).toBe(eventsBefore)
    expect(tableCount(testDb.sqlite, "payments")).toBe(paymentsBefore)

    const preservedEvent = testDb.db.select().from(events).where(eq(events.id, eventId)).get()
    expect(preservedEvent?.title).toBe("Pre-migration event")
    expect(preservedEvent?.internalNotes).toBe("Keep this note")

    const touchpointsTable = testDb.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'touchpoints'")
      .get()
    expect(touchpointsTable).toEqual({ name: "touchpoints" })

    const repo = createTouchpointsRepository(testDb.db)
    const created = repo.insert(eventId, {
      title: "Post-migration touchpoint",
      dueDate: "2026-08-10T00:00:00.000Z",
    })

    expect(created.eventId).toBe(eventId)
    expect(repo.getByEventId(eventId)).toHaveLength(1)
  })
})
