// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { runMigrations } from "../factory.js"
import { events, timeblocks } from "../schema.js"
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

async function createPreBeverageSplitMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-beverage-split-migration-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const splitEntry = journal.entries.find((entry) => entry.tag === "0017_beverage_timeblock_split")
  if (!splitEntry) {
    throw new Error("Expected 0017_beverage_timeblock_split migration entry")
  }

  journal.entries = journal.entries.filter((entry) => entry.idx < splitEntry.idx)
  await writeFile(journalPath, JSON.stringify(journal, null, 2))

  await rm(join(tempMigrationsFolder, `${splitEntry.tag}.sql`), { force: true })
  await rm(join(tempMigrationsFolder, "meta", `${String(splitEntry.idx).padStart(4, "0")}_snapshot.json`), {
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

describe("0017_beverage_timeblock_split migration", () => {
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

  it("moves beverage items to event scope and preserves assignments", async () => {
    const preSplit = await createPreBeverageSplitMigrationsFolder()
    tempMigrationCleanup = preSplit.cleanup

    testDb = await createTestDb({ migrationsFolder: preSplit.tempMigrationsFolder })

    const eventId = uuidv4()
    const timeblockId = uuidv4()
    const itemId = uuidv4()

    testDb.db.insert(events).values({
      id: eventId,
      title: "Legacy Beverage Event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(timeblocks).values({
      id: timeblockId,
      eventId,
      title: "Bar Service",
      time: "17:30",
      sectionType: "beverage",
      createdAt: new Date().toISOString(),
    }).run()

  testDb.sqlite.prepare(`
      INSERT INTO beverage_items (id, timeblock_id, name, quantity, type, service_style, includes, unit_price_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, timeblockId, "House Red", 8, "Wine", "Open Bar", "Chilled", 1200)

    await runMigrations(testDb.db, migrationsFolder)

    const itemRow = testDb.sqlite.prepare(`
      SELECT id, event_id, name, quantity, type, service_style, includes, unit_price_cents
      FROM beverage_items
      WHERE id = ?
    `).get(itemId) as {
      id: string
      event_id: string
      name: string
      quantity: number
      type: string
      service_style: string
      includes: string
      unit_price_cents: number
    }

    expect(itemRow.event_id).toBe(eventId)
    expect(itemRow.name).toBe("House Red")
    expect(itemRow.quantity).toBe(8)
    expect(itemRow.type).toBe("Wine")
    expect(itemRow.service_style).toBe("Open Bar")
    expect(itemRow.includes).toBe("Chilled")
    expect(itemRow.unit_price_cents).toBe(1200)

    const assignment = testDb.sqlite.prepare(`
      SELECT beverage_item_id, timeblock_id
      FROM beverage_item_timeblocks
      WHERE beverage_item_id = ?
    `).get(itemId) as { beverage_item_id: string; timeblock_id: string }

    expect(assignment.timeblock_id).toBe(timeblockId)

    testDb.db.delete(timeblocks).where(eq(timeblocks.id, timeblockId)).run()

    const survivingItem = testDb.sqlite.prepare(`
      SELECT id FROM beverage_items WHERE id = ?
    `).get(itemId)

    expect(survivingItem).toBeTruthy()
  })
})
