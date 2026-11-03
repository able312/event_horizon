import type { Doc } from "../_generated/dataModel"
import { toRecord } from "./records"

// Food items used to have one note, `includes`. It is now split into `clientNotes`
// (what `includes` held; the client may see it) and `internalNotes` (kitchen/staff only).
//
// Transition: `foodItems:migrateIncludesToClientNotes` moves every stored `includes` into
// `clientNotes`. Until then, and while teammates still run app builds from before the
// split (v0.3.2 and earlier), these helpers keep both shapes working:
// - Reads treat a legacy `includes` as the client note, and also return the client note
//   as `includes` so older builds still show it. Without that, an older build would show
//   an empty note and blank the client note the next time someone clicked into it.
// - Writes accept `includes` from older builds and save it as `clientNotes`.
// Remove `includes` from here, the schema and the mutation args once every client has
// updated and the migration has run on every deployment.

type StoredNotes = Pick<Doc<"foodItems">, "includes" | "clientNotes" | "internalNotes">

export type FoodItemNoteValues = {
  clientNotes?: string | null
  internalNotes?: string | null
  /** Legacy name for `clientNotes`, sent by app builds from before the split. */
  includes?: string | null
}

function storedClientNotes(doc: StoredNotes): string | null {
  return doc.clientNotes !== undefined ? doc.clientNotes : (doc.includes ?? null)
}

export function toFoodItemRecord(doc: Doc<"foodItems">) {
  const { includes, ...record } = toRecord(doc)
  void includes
  const clientNotes = storedClientNotes(doc)
  return { ...record, clientNotes, internalNotes: doc.internalNotes ?? null, includes: clientNotes }
}

/** Note fields for a new food item. */
export function newFoodItemNotes(values: FoodItemNoteValues) {
  return {
    clientNotes: values.clientNotes ?? values.includes ?? null,
    internalNotes: values.internalNotes ?? null,
  }
}

/**
 * Turns update args into a patch. A client note sent as `includes` lands in `clientNotes`,
 * and any patch that sets `clientNotes` also clears a leftover `includes`.
 */
export function foodItemNotesPatch<T extends FoodItemNoteValues>(updates: T, current: StoredNotes) {
  const { includes, ...rest } = updates
  const clientNotes = rest.clientNotes !== undefined ? rest.clientNotes : includes
  if (clientNotes !== undefined) return { ...rest, clientNotes, includes: undefined }
  // Not editing the client note: carry a legacy note over so clearing `includes` loses nothing.
  if (current.includes !== undefined) return { ...rest, clientNotes: storedClientNotes(current), includes: undefined }
  return rest
}

/** The migration's patch for one stored item, or null when it is already migrated. */
export function migratedFoodItemNotes(doc: StoredNotes) {
  if (doc.includes === undefined && doc.clientNotes !== undefined && doc.internalNotes !== undefined) return null
  return { clientNotes: storedClientNotes(doc), internalNotes: doc.internalNotes ?? null, includes: undefined }
}
