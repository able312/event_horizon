import type { Doc, TableNames } from "../_generated/dataModel"

/** A document as a shared record: `_id` becomes `id`, Convex system fields are dropped. */
export type RecordOf<T extends TableNames> = Omit<Doc<T>, "_id" | "_creationTime"> & { id: Doc<T>["_id"] }

export function toRecord<T extends TableNames>(doc: Doc<T>): RecordOf<T> {
  const { _id, _creationTime, ...fields } = doc
  void _creationTime
  return { id: _id, ...fields } as RecordOf<T>
}
