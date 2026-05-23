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
const STRAY_SQL = `ALTER TABLE \`timeblocks\` ADD \`notes\` text;--> statement-breakpoint
ALTER TABLE \`timeblocks\` ADD \`default_service_style\` text;--> statement-breakpoint
ALTER TABLE \`food_items\` ADD \`components\` text;--> statement-breakpoint
ALTER TABLE \`food_items\` ADD \`setup_notes\` text;--> statement-breakpoint
UPDATE \`food_items\`
SET \`setup_notes\` = \`includes\`
WHERE \`includes\` IS NOT NULL AND \`setup_notes\` IS NULL;`

type JournalEntry = {
  idx: number
  version?: string
  when?: number
  tag: string
  breakpoints?: boolean
}

type Journal = {
  entries: JournalEntry[]
}

async function createStrayMigrationStateFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-stray-food-migrations-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  journal.entries = journal.entries.filter((entry) => entry.idx < 12)

  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await rm(join(tempMigrationsFolder, "0012_neat_reconciliation.sql"), { force: true })
  await rm(join(tempMigrationsFolder, "0013_blue_lagoon.sql"), { force: true })
  await rm(join(tempMigrationsFolder, "meta", "0012_snapshot.json"), { force: true })
  await rm(join(tempMigrationsFolder, "meta", "0013_snapshot.json"), { force: true })

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

function foreignKeyTables(sqlite: TestDb["sqlite"], tableName: string): string[] {
  return sqlite.prepare(`PRAGMA foreign_key_list(${tableName})`).all().map((foreignKey) => {
    const typedForeignKey = foreignKey as { table: string }
    return typedForeignKey.table
  })
}

function runStatementBatch(sqlite: TestDb["sqlite"], batch: string): void {
  for (const statement of batch
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    sqlite.exec(statement)
  }
}

describe("rollback stray food workspace migration", () => {
  let testDb: TestDb | null = null

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup()
      testDb = null
    }
  })

  it("repairs databases that already applied the stray 0012 migration", async () => {
    const strayState = await createStrayMigrationStateFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: strayState.tempMigrationsFolder })
      runStatementBatch(testDb.sqlite, STRAY_SQL)

      testDb.sqlite.prepare(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-1', 'Repair Event', 'created')
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO timeblocks (id, event_id, title, time, section_type, assigned_to, created_at, updated_at, notes, default_service_style)
        VALUES ('tb-1', 'event-1', 'Dinner', '18:00', 'food', 'Kitchen', 'created', NULL, 'Legacy note', 'Buffet')
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO food_items (id, timeblock_id, name, quantity, service_style, includes, unit_price_cents, components, setup_notes)
        VALUES ('food-1', 'tb-1', 'Chicken Supreme', 1, 'Buffet', 'Chafer', 2500, 'Potatoes', 'Hot hold at pass')
      `).run()

      runMigrations(testDb.db, migrationsFolder)

      expect(columnNames(testDb.sqlite, "timeblocks")).toEqual([
        "id",
        "event_id",
        "title",
        "time",
        "details",
        "section_type",
        "assigned_to",
        "created_at",
        "updated_at",
      ])

      expect(columnNames(testDb.sqlite, "food_items")).toEqual([
        "id",
        "timeblock_id",
        "name",
        "quantity",
        "service_style",
        "includes",
        "unit_price_cents",
      ])

      expect(foreignKeyTables(testDb.sqlite, "beverage_items")).toEqual(["timeblocks"])
      expect(foreignKeyTables(testDb.sqlite, "vendor_items")).toEqual(["timeblocks"])

      const repairedTimeblock = testDb.sqlite.prepare(`
        SELECT id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at
        FROM timeblocks
        WHERE id = 'tb-1'
      `).get() as Record<string, string | null>

      expect(repairedTimeblock).toEqual({
        id: "tb-1",
        event_id: "event-1",
        title: "Dinner",
        time: "18:00",
        details: null,
        section_type: "food",
        assigned_to: "Kitchen",
        created_at: "created",
        updated_at: null,
      })

      const repairedFoodItem = testDb.sqlite.prepare(`
        SELECT id, timeblock_id, name, quantity, service_style, includes, unit_price_cents
        FROM food_items
        WHERE id = 'food-1'
      `).get() as Record<string, string | number | null>

      expect(repairedFoodItem).toEqual({
        id: "food-1",
        timeblock_id: "tb-1",
        name: "Chicken Supreme",
        quantity: 1,
        service_style: "Buffet",
        includes: "Chafer",
        unit_price_cents: 2500,
      })

    } finally {
      await strayState.cleanup()
    }
  })

  it("creates databases with the current post-migration schema", async () => {
    testDb = await createTestDb()

    try {
      testDb.sqlite.prepare(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-2', 'Clean Event', 'created')
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-2', 'event-2', 'Lunch', '12:00', NULL, 'food', 'Chef', 'created', NULL)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO food_items (id, timeblock_id, name, quantity, service_style, includes, unit_price_cents)
        VALUES ('food-2', 'tb-2', 'Salad', 2, 'Plated', 'Dressing', 1800)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at)
        VALUES
          ('tb-bev-2', 'event-2', 'Bar', '17:00', NULL, 'beverage', 'Bar Team', 'created', NULL),
          ('tb-vendor-2', 'event-2', 'Band', '15:30', NULL, 'vendor', 'Planner', 'created', NULL),
          ('tb-setup-2', 'event-2', 'Flip', '16:00', 'Place linens.', 'setup_instruction', 'Ops', 'created', NULL),
          ('tb-note-2', 'event-2', 'Reminder', '14:00', 'Check candles.', 'note', 'Lead', 'created', NULL)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO beverage_items (id, timeblock_id, name, quantity, type, service_style, includes, unit_price_cents)
        VALUES ('bev-2', 'tb-bev-2', 'Negroni', 3, 'Cocktail', 'Open Bar', 'Orange peel', 1800)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email, notes)
        VALUES ('vendor-2', 'tb-vendor-2', 'Band Lead', '555-2000', 'band@example.com', 'Need stage power')
      `).run()

      expect(columnNames(testDb.sqlite, "timeblocks")).toEqual([
        "id",
        "event_id",
        "title",
        "time",
        "details",
        "section_type",
        "assigned_to",
        "created_at",
        "updated_at",
      ])

      expect(columnNames(testDb.sqlite, "food_items")).toEqual([
        "id",
        "timeblock_id",
        "name",
        "quantity",
        "service_style",
        "includes",
        "unit_price_cents",
      ])

      expect(foreignKeyTables(testDb.sqlite, "beverage_items")).toEqual(["timeblocks"])
      expect(foreignKeyTables(testDb.sqlite, "vendor_items")).toEqual(["timeblocks"])

      const timeblockRow = testDb.sqlite.prepare(`
        SELECT id, event_id, title, time, details, section_type, assigned_to, created_at, updated_at
        FROM timeblocks
        WHERE id = 'tb-2'
      `).get()

      expect(timeblockRow).toEqual({
        id: "tb-2",
        event_id: "event-2",
        title: "Lunch",
        time: "12:00",
        details: null,
        section_type: "food",
        assigned_to: "Chef",
        created_at: "created",
        updated_at: null,
      })

      const foodItemRow = testDb.sqlite.prepare(`
        SELECT id, timeblock_id, name, quantity, service_style, includes, unit_price_cents
        FROM food_items
        WHERE id = 'food-2'
      `).get()

      expect(foodItemRow).toEqual({
        id: "food-2",
        timeblock_id: "tb-2",
        name: "Salad",
        quantity: 2,
        service_style: "Plated",
        includes: "Dressing",
        unit_price_cents: 1800,
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, timeblock_id, name, quantity, type, service_style, includes, unit_price_cents
        FROM beverage_items
        WHERE id = 'bev-2'
      `).get()).toEqual({
        id: "bev-2",
        timeblock_id: "tb-bev-2",
        name: "Negroni",
        quantity: 3,
        type: "Cocktail",
        service_style: "Open Bar",
        includes: "Orange peel",
        unit_price_cents: 1800,
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, timeblock_id, contact_name, contact_phone, contact_email, notes
        FROM vendor_items
        WHERE id = 'vendor-2'
      `).get()).toEqual({
        id: "vendor-2",
        timeblock_id: "tb-vendor-2",
        contact_name: "Band Lead",
        contact_phone: "555-2000",
        contact_email: "band@example.com",
        notes: "Need stage power",
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, details
        FROM timeblocks
        WHERE id = 'tb-setup-2'
      `).get()).toEqual({
        id: "tb-setup-2",
        details: "Place linens.",
      })

      expect(testDb.sqlite.prepare(`
        SELECT id, details
        FROM timeblocks
        WHERE id = 'tb-note-2'
      `).get()).toEqual({
        id: "tb-note-2",
        details: "Check candles.",
      })

      const notesTable = testDb.sqlite.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'notes'
      `).get()
      const setupInstructionsTable = testDb.sqlite.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'setup_instructions'
      `).get()

      expect(notesTable).toBeUndefined()
      expect(setupInstructionsTable).toBeUndefined()
    } finally {
      // no-op
    }
  })
})
