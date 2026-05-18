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
  const repairEntry = journal.entries.find((entry) => entry.tag === "0012_neat_reconciliation")
  if (!repairEntry) {
    throw new Error("Expected tracked repair migration entry")
  }

  journal.entries = journal.entries.filter((entry) => entry.tag !== "0012_neat_reconciliation")
  journal.entries.push({
    idx: repairEntry.idx,
    version: "6",
    when: 1779050905293,
    tag: "0012_spicy_horizon",
    breakpoints: true,
  })

  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await rm(join(tempMigrationsFolder, "0012_neat_reconciliation.sql"), { force: true })
  await rm(join(tempMigrationsFolder, "meta", "0012_snapshot.json"), { force: true })
  await writeFile(join(tempMigrationsFolder, "0012_spicy_horizon.sql"), STRAY_SQL)

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

      const repairedTimeblock = testDb.sqlite.prepare(`
        SELECT id, event_id, title, time, section_type, assigned_to, created_at, updated_at
        FROM timeblocks
        WHERE id = 'tb-1'
      `).get() as Record<string, string | null>

      expect(repairedTimeblock).toEqual({
        id: "tb-1",
        event_id: "event-1",
        title: "Dinner",
        time: "18:00",
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

  it("runs safely on databases that already match the current schema", async () => {
    const strayState = await createStrayMigrationStateFolder()

    try {
      testDb = await createTestDb({ migrationsFolder: strayState.tempMigrationsFolder })

      testDb.sqlite.prepare(`
        INSERT INTO events (id, title, created_at)
        VALUES ('event-2', 'Clean Event', 'created')
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO timeblocks (id, event_id, title, time, section_type, assigned_to, created_at, updated_at)
        VALUES ('tb-2', 'event-2', 'Lunch', '12:00', 'food', 'Chef', 'created', NULL)
      `).run()

      testDb.sqlite.prepare(`
        INSERT INTO food_items (id, timeblock_id, name, quantity, service_style, includes, unit_price_cents)
        VALUES ('food-2', 'tb-2', 'Salad', 2, 'Plated', 'Dressing', 1800)
      `).run()

      testDb.sqlite.prepare(`
        DELETE FROM __drizzle_migrations
        WHERE hash = '9a08a7c377b88887c8733b1863f086b1404e43241d225b0740d117ae43530bab'
      `).run()

      testDb.sqlite.prepare(`ALTER TABLE timeblocks DROP COLUMN notes`).run()
      testDb.sqlite.prepare(`ALTER TABLE timeblocks DROP COLUMN default_service_style`).run()
      testDb.sqlite.prepare(`ALTER TABLE food_items DROP COLUMN components`).run()
      testDb.sqlite.prepare(`ALTER TABLE food_items DROP COLUMN setup_notes`).run()

      runMigrations(testDb.db, migrationsFolder)

      expect(columnNames(testDb.sqlite, "timeblocks")).toEqual([
        "id",
        "event_id",
        "title",
        "time",
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

      const timeblockRow = testDb.sqlite.prepare(`
        SELECT id, event_id, title, time, section_type, assigned_to, created_at, updated_at
        FROM timeblocks
        WHERE id = 'tb-2'
      `).get()

      expect(timeblockRow).toEqual({
        id: "tb-2",
        event_id: "event-2",
        title: "Lunch",
        time: "12:00",
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
    } finally {
      await strayState.cleanup()
    }
  })
})
