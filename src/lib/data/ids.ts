import type { Id, TableNames } from "../../../convex/_generated/dataModel"

/**
 * Record IDs are plain strings outside the data layer. Convex validates their shape
 * and table on every call, so this cast only satisfies the generated types.
 */
export function toId<Table extends TableNames>(id: string): Id<Table> {
  return id as Id<Table>
}

export function toIds<Table extends TableNames>(ids: readonly string[]): Id<Table>[] {
  return ids.map((id) => toId<Table>(id))
}
