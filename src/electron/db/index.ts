import { app } from 'electron';
import { join } from "path"
import { fileURLToPath } from 'url';
import { createDatabase, createSqliteConnection, runMigrations } from "./factory.js";
import { isDev } from "../utils.js";
import { prepareDevelopmentDb } from "./worktreeDatabase.js";

const dbPath = isDev()
  ? prepareDevelopmentDb(app.getAppPath(), app.getPath("userData"))
  : join(app.getPath("userData"), "app.sqlite")
const sqliteDb = createSqliteConnection(dbPath)

export const db = createDatabase(sqliteDb)

/**
 * Initialize the database.
 * 
 * Uses Drizzle migrations on the selected database.
 */
export function initDB() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url))

  runMigrations(db, join(__dirname, "../../migrations/drizzle"))
  console.log(`✅ Database migrated: ${dbPath}`)
}
