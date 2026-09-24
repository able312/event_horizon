import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { readMigrationFiles } from "drizzle-orm/migrator"
import type { SqliteConnection } from "./factory.js"

type LastMigration = { created_at: number | null }

/** Returns a backup path only when an existing database has pending migrations. */
export function backupBeforePendingMigrations(
  sqlite: SqliteConnection,
  dbPath: string,
  migrationsFolder: string,
  existedBeforeOpen: boolean,
): string | undefined {
  const migrations = readMigrationFiles({ migrationsFolder })
  const hasHistory = sqlite.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
  ).get() !== undefined
  const lastApplied = hasHistory
    ? (sqlite.prepare("SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1").get() as LastMigration | undefined)?.created_at ?? 0
    : 0
  const nextMigration = migrations.find((migration) => migration.folderMillis > Number(lastApplied))
  if (!existedBeforeOpen || !nextMigration) return undefined

  const backupDir = join(dirname(dbPath), "backups")
  mkdirSync(backupDir, { recursive: true })
  const backupPath = join(backupDir, `before-${nextMigration.folderMillis}-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.sqlite`)
  try {
    // VACUUM INTO captures a consistent snapshot, including uncheckpointed WAL data.
    sqlite.exec(`VACUUM INTO '${backupPath.replaceAll("'", "''")}'`)
  } catch (error) {
    rmSync(backupPath, { force: true })
    throw error
  }
  return backupPath
}
