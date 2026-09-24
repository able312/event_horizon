// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, it } from "vitest"
import { createDatabase, createSqliteConnection, runMigrations } from "./factory.js"
import { backupBeforePendingMigrations } from "./migrationBackup.js"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

it("backs up existing data before pending migrations and leaves it available after failure", () => {
  const root = mkdtempSync(join(tmpdir(), "event-horizon-backup-"))
  roots.push(root)
  const dbPath = join(root, "app.sqlite")
  const migrationsFolder = join(root, "migrations")
  mkdirSync(join(migrationsFolder, "meta"), { recursive: true })
  writeFileSync(join(migrationsFolder, "meta", "_journal.json"), JSON.stringify({
    entries: [{ idx: 0, version: "6", when: 1, tag: "0000_fail", breakpoints: false }],
  }))
  writeFileSync(join(migrationsFolder, "0000_fail.sql"), "INSERT INTO missing_table VALUES (1);")

  const sqlite = createSqliteConnection(dbPath)
  try {
    sqlite.pragma("journal_mode = WAL")
    sqlite.exec("CREATE TABLE important (value TEXT NOT NULL); INSERT INTO important VALUES ('keep me')")
    const backupPath = backupBeforePendingMigrations(sqlite, dbPath, migrationsFolder, true)
    expect(backupPath).toBeDefined()
    expect(existsSync(backupPath!)).toBe(true)
    expect(() => runMigrations(createDatabase(sqlite), migrationsFolder)).toThrow()
    expect(sqlite.prepare("SELECT value FROM important").get()).toEqual({ value: "keep me" })

    const backup = createSqliteConnection(backupPath!)
    try {
      expect(backup.prepare("SELECT value FROM important").get()).toEqual({ value: "keep me" })
    } finally {
      backup.close()
    }
    expect(backupBeforePendingMigrations(sqlite, dbPath, migrationsFolder, false)).toBeUndefined()
    expect(readFileSync(backupPath!).length).toBeGreaterThan(0)
  } finally {
    sqlite.close()
  }
})

it("does not make a backup when migrations are already applied", () => {
  const root = mkdtempSync(join(tmpdir(), "event-horizon-backup-"))
  roots.push(root)
  const dbPath = join(root, "app.sqlite")
  const migrationsFolder = join(process.cwd(), "migrations", "drizzle")
  const sqlite = createSqliteConnection(dbPath)
  try {
    runMigrations(createDatabase(sqlite), migrationsFolder)
    expect(backupBeforePendingMigrations(sqlite, dbPath, migrationsFolder, true)).toBeUndefined()
  } finally {
    sqlite.close()
  }
})
