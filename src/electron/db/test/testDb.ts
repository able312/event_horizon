import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createDatabase, createSqliteConnection, runMigrations, type AppDatabase, type SqliteConnection } from "../factory.js"

type CreateTestDbOptions = {
  migrationsFolder?: string
}

export type TestDb = {
  sqlite: SqliteConnection
  db: AppDatabase
  cleanup: () => Promise<void>
}

export async function createTestDb(options: CreateTestDbOptions = {}): Promise<TestDb> {
  const tempDir = await mkdtemp(join(tmpdir(), "event-horizon-db-"))
  const dbPath = join(tempDir, "test.sqlite")
  const sqlite = createSqliteConnection(dbPath)

  sqlite.pragma("foreign_keys = ON")

  const db = createDatabase(sqlite)
  runMigrations(db, options.migrationsFolder ?? join(process.cwd(), "migrations/drizzle"))

  return {
    sqlite,
    db,
    cleanup: async () => {
      if (sqlite.open) sqlite.close()
      await rm(tempDir, { recursive: true, force: true })
    },
  }
}
