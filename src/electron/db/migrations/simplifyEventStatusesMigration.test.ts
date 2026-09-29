// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"

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

async function createPreSimplifyStatusesMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-simplify-statuses-migration-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const simplifyEntry = journal.entries.find((entry) => entry.tag === "0018_simplify_event_statuses")
  if (!simplifyEntry) {
    throw new Error("Expected 0018_simplify_event_statuses migration entry")
  }

  journal.entries = journal.entries.filter((entry) => entry.idx < simplifyEntry.idx)
  await writeFile(journalPath, JSON.stringify(journal, null, 2))

  await rm(join(tempMigrationsFolder, `${simplifyEntry.tag}.sql`), { force: true })

  return {
    tempMigrationsFolder,
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true })
    },
  }
}

const EXPECTED_STATUS_MAPPING: Record<string, string> = {
  new_lead: "new_lead",
  contacted: "tentative",
  ready_for_estimate: "tentative",
  estimate_sent: "tentative",
  estimate_confirmed: "tentative",
  agreement_sent: "tentative",
  agreement_and_deposit_received: "confirmed",
  planning: "confirmed",
  details_locked: "confirmed",
  event_complete: "closed",
  invoice_sent: "closed",
  paid_in_full: "closed",
  closed: "closed",
  lost: "lost",
}

describe("0018_simplify_event_statuses migration", () => {
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

  it("maps every legacy status onto the simplified set without touching other data", async () => {
    const preMigration = await createPreSimplifyStatusesMigrationsFolder()
    tempMigrationCleanup = preMigration.cleanup

    testDb = await createTestDb({ migrationsFolder: preMigration.tempMigrationsFolder })

    const createdAt = new Date().toISOString()
    const insertEvent = testDb.sqlite.prepare(
      "INSERT INTO events (id, title, status, internal_notes, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    const idsByLegacyStatus = new Map<string, string>()
    for (const legacyStatus of Object.keys(EXPECTED_STATUS_MAPPING)) {
      const id = uuidv4()
      idsByLegacyStatus.set(legacyStatus, id)
      insertEvent.run(id, `Event ${legacyStatus}`, legacyStatus, `Notes ${legacyStatus}`, createdAt)
    }
    const unknownId = uuidv4()
    insertEvent.run(unknownId, "Event unknown", "not_a_status", null, createdAt)

    runMigrations(testDb.db, migrationsFolder)

    const selectEvent = testDb.sqlite.prepare("SELECT title, status, internal_notes FROM events WHERE id = ?")
    for (const [legacyStatus, expectedStatus] of Object.entries(EXPECTED_STATUS_MAPPING)) {
      expect(selectEvent.get(idsByLegacyStatus.get(legacyStatus))).toEqual({
        title: `Event ${legacyStatus}`,
        status: expectedStatus,
        internal_notes: `Notes ${legacyStatus}`,
      })
    }
    expect(selectEvent.get(unknownId)).toMatchObject({ status: "new_lead" })
  })
})
