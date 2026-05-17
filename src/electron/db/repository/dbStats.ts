import { db } from "../index.js"
import { sql } from "drizzle-orm"

// helper result shapes
type TableRow = { name: string }
type CountRow = { count: number }

export async function getDatabaseStatsDynamic(): Promise<Record<string, number>> {
  // 1. get all table names from sqlite_master
  const tables = await db
    .select({ name: sql<string>`name` })
    .from(sql<TableRow>`sqlite_master`)
    .where(sql`type = 'table' AND name NOT LIKE 'sqlite_%'`)

  const result: Record<string, number> = {}

  // 2. loop tables and count rows
  for (const t of tables) {
    const row = db
      .select({ count: sql<number>`count(*)` })
      .from(sql<CountRow>`${sql.raw(t.name)}`)
      .get()

    result[t.name] = row?.count ?? 0
  }

  return result
}