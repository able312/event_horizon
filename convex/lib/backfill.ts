import type { Doc, TableNames } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

/** Tables that have one-off backfills for fields added after production had data. */
type BackfillTable = "foodItems" | "beverageItems" | "timeblocks"

/** Default values for optional fields, keyed by field name. */
export type FieldDefaults<T extends BackfillTable> = Partial<Omit<Doc<T>, "_id" | "_creationTime">>

/** The fields of `defaults` that `doc` doesn't have yet, or null when it has them all. */
export function missingFieldsPatch<T extends TableNames>(doc: object, defaults: object): Partial<Doc<T>> | null {
  const stored = doc as Record<string, unknown>
  const patch = Object.fromEntries(Object.entries(defaults).filter(([field]) => stored[field] === undefined))
  return Object.keys(patch).length > 0 ? patch as Partial<Doc<T>> : null
}

/**
 * One batch of a one-off backfill: gives each document in `table` the `defaults` it is
 * missing and skips documents that already have them all, so it is safe to run again.
 * Not a user edit, so the audit fields are left alone. `migration` names it in the logs.
 */
export async function backfillMissingFieldsBatch<T extends BackfillTable>(
  ctx: Pick<MutationCtx, "db">,
  table: T,
  migration: string,
  defaults: FieldDefaults<T>,
  cursor: string | null,
  batchSize: number,
) {
  const batch = await ctx.db.query(table).paginate({ cursor, numItems: batchSize })
  let migrated = 0, skipped = 0
  for (const doc of batch.page) {
    const patch = missingFieldsPatch<T>(doc, defaults)
    if (!patch) { skipped++; continue }
    await ctx.db.patch(table, doc._id, patch)
    migrated++
  }
  console.log(`${table}:${migration} batch: ${migrated} migrated, ${skipped} already done`)
  return { migrated, skipped, isDone: batch.isDone, continueCursor: batch.continueCursor }
}
