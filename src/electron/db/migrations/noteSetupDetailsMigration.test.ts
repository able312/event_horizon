// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runMigrations } from "../factory.js"
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

async function createPreDetailsMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-note-setup-migrations-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  journal.entries = journal.entries.filter((entry) => entry.idx < 14)

  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await rm(join(tempMigrationsFolder, "0014_sour_details.sql"), { force: true })

  return {
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true })
    },
    tempMigrationsFolder,
  }
}

describe("note/setup details migration", () => {
  let testDb: TestDb | null = null

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup()
      testDb = null
    }
  })

  it("moves note and setup text into timeblocks.details and drops legacy tables", async () => {
    const preDetailsState = await createPreDetailsMigrationsFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preDetailsState.tempMigrationsFolder })

      testDb.sqlite.prepare(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-1', 'Migration Event', 'created')
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO timeblocks (id, event_id, title, time, section_type, assigned_to, created_at, updated_at)
        VALUES
          ('tb-note-1', 'event-1', 'Note', '09:00', 'note', NULL, 'created', NULL),
          ('tb-setup-1', 'event-1', 'Setup', '08:00', 'setup_instruction', NULL, 'created', NULL),
          ('tb-food-1', 'event-1', 'Food', '12:00', 'food', NULL, 'created', NULL)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO notes (id, timeblock_id, content, created_at, updated_at)
        VALUES ('note-1', 'tb-note-1', 'Check candles.', 'created', NULL)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO setup_instructions (id, timeblock_id, instruction, created_at, updated_at)
        VALUES ('setup-1', 'tb-setup-1', 'Place linens.', 'created', NULL)
      `).run()

      runMigrations(testDb.db, migrationsFolder)

      expect(testDb.sqlite.prepare(`
        SELECT id, details
        FROM timeblocks
        WHERE id = 'tb-note-1'
      `).get()).toEqual({
        id: "tb-note-1",
        details: "Check candles.",
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, details
        FROM timeblocks
        WHERE id = 'tb-setup-1'
      `).get()).toEqual({
        id: "tb-setup-1",
        details: "Place linens.",
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, details
        FROM timeblocks
        WHERE id = 'tb-food-1'
      `).get()).toEqual({
        id: "tb-food-1",
        details: null,
      })

      expect(testDb.sqlite.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'notes'
      `).get()).toBeUndefined()

      expect(testDb.sqlite.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'setup_instructions'
      `).get()).toBeUndefined()
    } finally {
      await preDetailsState.cleanup()
    }
  })
})
