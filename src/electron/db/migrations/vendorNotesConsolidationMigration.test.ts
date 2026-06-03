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

async function createPreVendorNotesMigrationFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-vendor-notes-migrations-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  journal.entries = journal.entries.filter((entry) => entry.idx < 15)

  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await rm(join(tempMigrationsFolder, "0015_swift_vendor_details.sql"), { force: true })
  await rm(join(tempMigrationsFolder, "meta", "0015_snapshot.json"), { force: true })

  return {
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true })
    },
    tempMigrationsFolder,
  }
}

function columnNames(sqlite: TestDb["sqlite"], tableName: string): string[] {
  return sqlite.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => {
    const typedColumn = column as { name: string }
    return typedColumn.name
  })
}

describe("vendor notes consolidation migration", () => {
  let testDb: TestDb | null = null

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup()
      testDb = null
    }
  })

  it("moves vendor notes into empty timeblock details", async () => {
    const preMigrationState = await createPreVendorNotesMigrationFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preMigrationState.tempMigrationsFolder })

      testDb.sqlite.exec(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-1', 'Vendor Event', 'created');

        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-1', 'event-1', 'Photographer', '10:00', NULL, 'vendor', NULL, 'created', NULL);

        INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email, notes)
        VALUES ('vendor-1', 'tb-1', 'Pat Photo', '555-1000', 'photo@example.com', 'Vendor note');
      `)

      runMigrations(testDb.db, migrationsFolder)

      const migratedTimeblock = testDb.sqlite.prepare(`
        SELECT details
        FROM timeblocks
        WHERE id = 'tb-1'
      `).get() as { details: string | null }

      const migratedVendor = testDb.sqlite.prepare(`
        SELECT id, timeblock_id, contact_name, contact_phone, contact_email
        FROM vendor_items
        WHERE id = 'vendor-1'
      `).get() as Record<string, string | null>

      expect(migratedTimeblock.details).toBe("Vendor note")
      expect(columnNames(testDb.sqlite, "vendor_items")).toEqual([
        "id",
        "timeblock_id",
        "contact_name",
        "contact_phone",
        "contact_email",
      ])
      expect(migratedVendor).toEqual({
        id: "vendor-1",
        timeblock_id: "tb-1",
        contact_name: "Pat Photo",
        contact_phone: "555-1000",
        contact_email: "photo@example.com",
      })
    } finally {
      await preMigrationState.cleanup()
    }
  })

  it("appends vendor notes when details already exist", async () => {
    const preMigrationState = await createPreVendorNotesMigrationFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preMigrationState.tempMigrationsFolder })

      testDb.sqlite.exec(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-2', 'Vendor Event', 'created');

        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-2', 'event-2', 'Band', '15:00', 'Existing details', 'vendor', NULL, 'created', NULL);

        INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email, notes)
        VALUES ('vendor-2', 'tb-2', 'Band Lead', '555-2000', 'band@example.com', 'Vendor note');
      `)

      runMigrations(testDb.db, migrationsFolder)

      const migratedTimeblock = testDb.sqlite.prepare(`
        SELECT details
        FROM timeblocks
        WHERE id = 'tb-2'
      `).get() as { details: string | null }

      expect(migratedTimeblock.details).toBe("Existing details\n\nVendor note")
    } finally {
      await preMigrationState.cleanup()
    }
  })

  it("leaves details unchanged when vendor notes are blank", async () => {
    const preMigrationState = await createPreVendorNotesMigrationFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preMigrationState.tempMigrationsFolder })

      testDb.sqlite.exec(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-3', 'Vendor Event', 'created');

        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-3', 'event-3', 'Rental', '12:00', 'Existing details', 'vendor', NULL, 'created', NULL);

        INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email, notes)
        VALUES ('vendor-3', 'tb-3', 'Rental Rep', '555-3000', 'rental@example.com', '   ');
      `)

      runMigrations(testDb.db, migrationsFolder)

      const migratedTimeblock = testDb.sqlite.prepare(`
        SELECT details
        FROM timeblocks
        WHERE id = 'tb-3'
      `).get() as { details: string | null }

      expect(migratedTimeblock.details).toBe("Existing details")
    } finally {
      await preMigrationState.cleanup()
    }
  })

  it("repairs orphan vendor timeblocks by creating blank vendor rows", async () => {
    const preMigrationState = await createPreVendorNotesMigrationFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preMigrationState.tempMigrationsFolder })

      testDb.sqlite.exec(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-4', 'Vendor Event', 'created');

        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-4', 'event-4', 'Tent Rental', '08:00', NULL, 'vendor', NULL, 'created', NULL);
      `)

      runMigrations(testDb.db, migrationsFolder)

      const repairedVendor = testDb.sqlite.prepare(`
        SELECT timeblock_id, contact_name, contact_phone, contact_email
        FROM vendor_items
        WHERE timeblock_id = 'tb-4'
      `).get() as Record<string, string | null>

      expect(repairedVendor).toEqual({
        timeblock_id: "tb-4",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
      })
    } finally {
      await preMigrationState.cleanup()
    }
  })

  it("enforces one vendor row per timeblock after migration", async () => {
    const preMigrationState = await createPreVendorNotesMigrationFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: preMigrationState.tempMigrationsFolder })

      testDb.sqlite.exec(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-5', 'Vendor Event', 'created');

        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-5', 'event-5', 'DJ', '18:00', NULL, 'vendor', NULL, 'created', NULL);

        INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email, notes)
        VALUES ('vendor-5', 'tb-5', 'DJ Lead', '555-5000', 'dj@example.com', 'Bring mixer');
      `)

      runMigrations(testDb.db, migrationsFolder)

      expect(() => {
        testDb!.sqlite.prepare(`
          INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email)
          VALUES ('vendor-5b', 'tb-5', 'Duplicate', '', '')
        `).run()
      }).toThrow(/UNIQUE constraint failed: vendor_items\.timeblock_id/)
    } finally {
      await preMigrationState.cleanup()
    }
  })
})
