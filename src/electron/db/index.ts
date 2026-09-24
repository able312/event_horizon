import { app } from 'electron';
import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { join } from "path"
import { fileURLToPath } from 'url';
import { createDatabase, createSqliteConnection, runMigrations } from "./factory.js";
import { isDev } from "../utils.js";
import { getDevelopmentDbPath } from "./worktreeDatabase.js";
import { backupBeforePendingMigrations } from "./migrationBackup.js";
import { seedDevelopmentDatabase } from "./developmentSeed.js";

const mainDbPath = join(app.getPath("userData"), "app.sqlite")
const dbPath = isDev()
  ? getDevelopmentDbPath(app.getAppPath(), app.getPath("userData"))
  : mainDbPath
const existedBeforeOpen = existsSync(dbPath)
const isNewWorktreeDb = isDev() && dbPath !== mainDbPath && !existedBeforeOpen
mkdirSync(dirname(dbPath), { recursive: true })
const sqliteDb = createSqliteConnection(dbPath)

export const db = createDatabase(sqliteDb)

/**
 * Initialize the database.
 * 
 * Uses Drizzle migrations on the selected database.
 */
export function initDB() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url))
  const migrationsFolder = join(__dirname, "../../migrations/drizzle")

  const backupPath = backupBeforePendingMigrations(sqliteDb, dbPath, migrationsFolder, existedBeforeOpen)
  if (backupPath) console.log(`Database backup before migration: ${backupPath}`)
  runMigrations(db, migrationsFolder)
  if (isNewWorktreeDb) seedDevelopmentDatabase(db, sqliteDb)
  console.log(`✅ Database migrated: ${dbPath}`)
}
