// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

import { runMigrations } from "../factory.js"
import { DEFAULT_VENDOR_CATEGORIES } from "../repository/vendorCategories.js"
import { events, touchpoints } from "../schema.js"
import { createMigrationsFolderBefore } from "../test/migrationsFolder.js"
import { createTestDb, type TestDb } from "../test/testDb.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

const migrationsFolder = join(process.cwd(), "migrations/drizzle")
const CONTACT_TABLES = ["contacts", "vendor_categories", "contact_roles", "event_contacts"]

type Journal = { entries: Array<{ idx: number; tag: string }> }

async function createPreContactsMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-contacts-migration-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const contactsEntry = journal.entries.find((entry) => entry.tag === "0018_contacts")
  if (!contactsEntry) throw new Error("Expected 0018_contacts migration entry")

  journal.entries = journal.entries.filter((entry) => entry.idx < contactsEntry.idx)
  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await rm(join(tempMigrationsFolder, `${contactsEntry.tag}.sql`), { force: true })

  return {
    tempMigrationsFolder,
    cleanup: () => rm(tempRoot, { recursive: true, force: true }),
  }
}

function tableExists(sqlite: TestDb["sqlite"], name: string): boolean {
  return Boolean(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
}

describe("0018_contacts migration", () => {
  let testDb: TestDb | null = null
  let cleanupMigrations: (() => Promise<void>) | null = null

  afterEach(async () => {
    await testDb?.cleanup()
    testDb = null
    await cleanupMigrations?.()
    cleanupMigrations = null
  })

  it("adds the contacts tables and seeds vendor categories without touching existing rows", async () => {
    const preMigration = await createPreContactsMigrationsFolder()
    cleanupMigrations = preMigration.cleanup
    testDb = await createTestDb({ migrationsFolder: preMigration.tempMigrationsFolder })

    const eventId = uuidv4()
    const createdAt = new Date().toISOString()
    testDb.sqlite
      .prepare("INSERT INTO events (id, title, client_name, created_at) VALUES (?, 'Existing event', 'Legacy Client', ?)")
      .run(eventId, createdAt)
    testDb.db.insert(touchpoints).values({ id: uuidv4(), eventId, title: "Call", createdAt }).run()

    for (const table of CONTACT_TABLES) expect(tableExists(testDb.sqlite, table)).toBe(false)

    // Stop before 0019, which moves the client off the events table
    const through0018 = await createMigrationsFolderBefore("0019_contacts_backfill")
    try {
      runMigrations(testDb.db, through0018.folder)
    } finally {
      await through0018.cleanup()
    }

    for (const table of CONTACT_TABLES) expect(tableExists(testDb.sqlite, table)).toBe(true)

    const event = testDb.sqlite.prepare("SELECT client_name AS clientName FROM events WHERE id = ?").get(eventId)
    expect(event).toEqual({ clientName: "Legacy Client" })
    expect(testDb.db.select().from(touchpoints).all()).toHaveLength(1)

    const seeded = testDb.sqlite
      .prepare("SELECT key, label, color_token AS colorToken, sort_order AS sortOrder FROM vendor_categories ORDER BY sort_order")
      .all()
    expect(seeded).toEqual(DEFAULT_VENDOR_CATEGORIES)
  })

  it("enforces the role/category CHECK, active-email uniqueness and contact FK at the database level", async () => {
    testDb = await createTestDb()
    const { sqlite } = testDb
    const now = new Date().toISOString()
    const categoryId = (sqlite.prepare("SELECT id FROM vendor_categories WHERE key = 'catering'").get() as { id: string }).id

    const insertContact = sqlite.prepare(
      "INSERT INTO contacts (id, display_name, email, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    insertContact.run("c1", "Sarah Kim", "Sarah@Example.com", null, now, now)
    expect(() => insertContact.run("c2", "Other", " sarah@example.com ", null, now, now)).toThrow(/UNIQUE/)
    // Archived contacts don't hold the email
    expect(() => insertContact.run("c3", "Old Sarah", "sarah@example.com", now, now, now)).not.toThrow()
    expect(
      (sqlite.prepare("SELECT email_normalized AS e FROM contacts WHERE id = 'c1'").get() as { e: string }).e,
    ).toBe("sarah@example.com")

    const insertRole = sqlite.prepare(
      "INSERT INTO contact_roles (id, contact_id, role, vendor_category_id, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    expect(() => insertRole.run("r1", "c1", "vendor", null, now)).toThrow(/CHECK/)
    expect(() => insertRole.run("r2", "c1", "client", categoryId, now)).toThrow(/CHECK/)
    insertRole.run("r3", "c1", "client", null, now)
    expect(() => insertRole.run("r4", "c1", "client", null, now)).toThrow(/UNIQUE/)

    const eventId = uuidv4()
    testDb.db.insert(events).values({ id: eventId, title: "Event", createdAt: now }).run()
    sqlite
      .prepare(
        "INSERT INTO event_contacts (id, event_id, contact_id, role, created_at, updated_at) VALUES ('ec1', ?, 'c1', 'client', ?, ?)",
      )
      .run(eventId, now, now)

    // A contact with assignment history can't be hard-deleted
    expect(() => sqlite.prepare("DELETE FROM contacts WHERE id = 'c1'").run()).toThrow(/FOREIGN KEY/)

    // Deleting the event removes its assignments
    sqlite.prepare("DELETE FROM events WHERE id = ?").run(eventId)
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM event_contacts").get()).toEqual({ n: 0 })
  })
})
