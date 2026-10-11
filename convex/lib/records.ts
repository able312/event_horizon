import type { Doc, Id, TableNames } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/** A document as a shared record: `_id` becomes `id`, Convex system fields are dropped. */
export type RecordOf<T extends TableNames> = Omit<Doc<T>, "_id" | "_creationTime"> & { id: Doc<T>["_id"] }

export function toRecord<D extends Doc<TableNames>>(doc: D): Omit<D, "_id" | "_creationTime"> & { id: D["_id"] } {
  const { _id, _creationTime, ...fields } = doc
  void _creationTime
  return { id: _id, ...fields }
}

/** Convex validates ID shape, but foreign keys also need an existence check. */
export async function requireDocument<T extends TableNames>(
  ctx: Pick<QueryCtx, "db">,
  table: T,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(table, id)
  if (!doc) throw new Error(`${table}: record not found`)
  return doc
}

export function assertUpdates(updates: object): void {
  if (!Object.values(updates).some((value) => value !== undefined)) {
    throw new Error("Updates are required")
  }
}
