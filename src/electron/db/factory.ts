import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "./schema.js"

export type AppDatabase = BetterSQLite3Database<typeof schema>
export type SqliteConnection = ReturnType<typeof Database>

export function createSqliteConnection(dbPath: string): SqliteConnection {
  return new Database(dbPath)
}

export function createDatabase(sqlite: SqliteConnection): AppDatabase {
  return drizzle(sqlite, { schema })
}

export function runMigrations(database: AppDatabase, migrationsFolder: string): void {
  migrate(database, { migrationsFolder })
}
