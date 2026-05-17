// @vitest-environment node
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { runMigrations } from "../factory.js"
import { createCartDetailsRepository } from "../repository/cartDetails.js"
import { createTournamentDetailsRepository } from "../repository/tournamentDetails.js"
import { cartDetails, events, tournamentDetails } from "../schema.js"
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

async function createPreConstraintMigrationsFolder() {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-migrations-"))
  const tempMigrationsFolder = join(tempRoot, "drizzle")
  await cp(migrationsFolder, tempMigrationsFolder, { recursive: true })

  const journalPath = join(tempMigrationsFolder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const constraintMigrationEntry = await findConstraintMigrationEntry(
    tempMigrationsFolder,
    journal.entries,
  )
  if (!constraintMigrationEntry) {
    throw new Error("Expected one-to-one constraint migration entry")
  }

  const removedEntries = journal.entries.filter(
    (entry) => entry.idx >= constraintMigrationEntry.idx,
  )
  journal.entries = journal.entries.filter(
    (entry) => entry.idx < constraintMigrationEntry.idx,
  )

  await writeFile(journalPath, JSON.stringify(journal, null, 2))

  for (const entry of removedEntries) {
    await rm(join(tempMigrationsFolder, `${entry.tag}.sql`), { force: true })
    const snapshotName = `${String(entry.idx).padStart(4, "0")}_snapshot.json`
    await rm(join(tempMigrationsFolder, "meta", snapshotName), { force: true })
  }

  return {
    tempRoot,
    tempMigrationsFolder,
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true })
    },
  }
}

async function findConstraintMigrationEntry(
  migrationsDir: string,
  entries: JournalEntry[],
): Promise<JournalEntry | null> {
  for (const entry of entries) {
    const sqlPath = join(migrationsDir, `${entry.tag}.sql`)
    const sql = await readFile(sqlPath, "utf8")
    const addsTournamentConstraint = sql.includes("tournament_details_event_id_unique")
    const addsCartConstraint = sql.includes("cart_details_event_id_unique")
    if (addsTournamentConstraint || addsCartConstraint) {
      return entry
    }
  }

  return null
}

describe("one-to-one constraints migration", () => {
  let testDb: TestDb | null = null

  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup()
      testDb = null
    }
  })

  it("migrates a clean database and enforces unique event rows for tournament and cart details", async () => {
    testDb = await createTestDb()

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "One-to-one constraint test event",
      createdAt: new Date().toISOString(),
    }).run()

    testDb.db.insert(tournamentDetails).values({
      id: uuidv4(),
      eventId,
      createdAt: new Date().toISOString(),
    }).run()

    expect(() => {
      testDb!.db.insert(tournamentDetails).values({
        id: uuidv4(),
        eventId,
        createdAt: new Date().toISOString(),
      }).run()
    }).toThrow(/UNIQUE constraint failed: tournament_details\.event_id/)

    testDb.db.insert(cartDetails).values({
      id: uuidv4(),
      eventId,
      createdAt: new Date().toISOString(),
    }).run()

    expect(() => {
      testDb!.db.insert(cartDetails).values({
        id: uuidv4(),
        eventId,
        createdAt: new Date().toISOString(),
      }).run()
    }).toThrow(/UNIQUE constraint failed: cart_details\.event_id/)
  })

  it("fails migration loudly when duplicate tournament details already exist", async () => {
    const preConstraintMigrations = await createPreConstraintMigrationsFolder()
    try {
      testDb = await createTestDb({ migrationsFolder: preConstraintMigrations.tempMigrationsFolder })

      const eventId = uuidv4()
      testDb.db.insert(events).values({
        id: eventId,
        title: "Pre-constraint duplicate event",
        createdAt: new Date().toISOString(),
      }).run()

      testDb.db.insert(tournamentDetails).values({
        id: uuidv4(),
        eventId,
        createdAt: new Date().toISOString(),
      }).run()

      testDb.db.insert(tournamentDetails).values({
        id: uuidv4(),
        eventId,
        createdAt: new Date().toISOString(),
      }).run()

      expect(() => runMigrations(testDb!.db, migrationsFolder)).toThrow(
        /tournament_details_event_id_unique/
      )
    } finally {
      await preConstraintMigrations.cleanup()
    }
  })

  it("keeps tournament and cart repositories deterministic after constraints are added", async () => {
    testDb = await createTestDb()

    const eventId = uuidv4()
    testDb.db.insert(events).values({
      id: eventId,
      title: "Deterministic repository event",
      createdAt: new Date().toISOString(),
    }).run()

    const tournamentRepo = createTournamentDetailsRepository(testDb.db)
    const firstTournament = tournamentRepo.getOrCreateByEventId(eventId)
    const secondTournament = tournamentRepo.getOrCreateByEventId(eventId)
    const fetchedTournament = tournamentRepo.getByEventId(eventId)

    expect(secondTournament.id).toBe(firstTournament.id)
    expect(fetchedTournament.id).toBe(firstTournament.id)
    expect(testDb.db.select().from(tournamentDetails).where(eq(tournamentDetails.eventId, eventId)).all()).toHaveLength(1)

    const cartRepo = createCartDetailsRepository(testDb.db)
    const firstCart = cartRepo.getOrCreateByEventId(eventId)
    const secondCart = cartRepo.getOrCreateByEventId(eventId)
    const fetchedCart = cartRepo.getByEventId(eventId)

    expect(secondCart.id).toBe(firstCart.id)
    expect(fetchedCart.id).toBe(firstCart.id)
    expect(testDb.db.select().from(cartDetails).where(eq(cartDetails.eventId, eventId)).all()).toHaveLength(1)
  })
})
