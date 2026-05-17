import { app } from 'electron';
import { join } from "path"
import { fileURLToPath } from 'url';
import { createDatabase, createSqliteConnection, runMigrations } from "./factory.js";

const dbPath = join(app.getPath("userData"), "app.sqlite")
const sqliteDb = createSqliteConnection(dbPath)

export const db = createDatabase(sqliteDb)

/**
 * Initialize the database.
 * 
 * Uses Drizzle migrations. In development, delete the database file
 * to re-run migrations with new schema changes.
 */
export function initDB() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url))

  try {
    runMigrations(db, join(__dirname, "../../migrations/drizzle"))
    console.log("✅ Database migrated");
  } catch (err: unknown) {
    if (err instanceof Error) console.log("⚠️ Error running migration file, " + err.message);
    else console.log("⚠️ No migrations found");
  }
}
