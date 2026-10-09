import { paginationOptsValidator } from "convex/server"
import { v, type Value } from "convex/values"

import type { TableNames } from "./_generated/dataModel"
import { internalMutation, internalQuery } from "./_generated/server"
import { LEGACY_TABLES, type LegacyTable } from "./lib/legacyImport"

declare const process: { env: Record<string, string | undefined> }

// CLI-only functions for the one-time SQLite import (scripts/legacy-import.ts).
// Internal, so only someone with the deployment's admin access can call them.
// Writes also require EVENT_HORIZON_LEGACY_IMPORT=enabled, which the CLI sets for
// the duration of an import and then removes.

// Fails to compile if a table is added to the schema but not to the import.
type ImportsEveryTable = [LegacyTable] extends [Exclude<TableNames, "users">] ? ([Exclude<TableNames, "users">] extends [LegacyTable] ? true : false) : false
const importsEveryTable: ImportsEveryTable = true
void importsEveryTable

const legacyTable = v.union(...LEGACY_TABLES.map((spec) => v.literal(spec.table)))

/** Business tables that already hold documents. Users may exist; they aren't imported. */
export const nonEmptyTables = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const occupied: string[] = []
    for (const { table } of LEGACY_TABLES) if (await ctx.db.query(table).first()) occupied.push(table)
    return occupied
  },
})

/** Inserts documents into one table, returning their IDs in order. Schema validation applies. */
export const insertBatch = internalMutation({
  args: { table: legacyTable, docs: v.array(v.record(v.string(), v.any())) },
  returns: v.array(v.string()),
  handler: async (ctx, { table, docs }) => {
    if (process.env.EVENT_HORIZON_LEGACY_IMPORT !== "enabled") throw new Error("Legacy import is disabled on this deployment")
    const ids: string[] = []
    for (const doc of docs as Record<string, Value>[]) ids.push(await ctx.db.insert(table, doc as never))
    return ids
  },
})

/** One page of a table's raw documents, for verifying an import. */
export const dump = internalQuery({
  args: { table: legacyTable, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { table, paginationOpts }) => ctx.db.query(table).paginate(paginationOpts),
})
