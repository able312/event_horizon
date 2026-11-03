import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"

/** "client" is what the client may see; "internal" is the kitchen/staff-only note. */
export type ItemNoteTab = "client" | "internal"

export const ITEM_NOTE_FIELDS = {
  client: "clientNotes",
  internal: "internalNotes",
} as const satisfies Record<ItemNoteTab, keyof WorkspaceItemBase>

export function hasNoteText(note: string | null | undefined): boolean {
  return Boolean(note?.trim())
}

/**
 * The kitchen tab stays a dim "Add kitchen note…" prompt until it has a note or is the
 * open tab, so items without a kitchen note look like they did before the split.
 */
export function showsInternalNotePrompt(internalNote: string, activeTab: ItemNoteTab): boolean {
  return activeTab !== "internal" && !hasNoteText(internalNote)
}

/** One-line preview of a note: blank lines become " | ", other line breaks ", ". */
export function toNotePreview(note: string): string {
  return note.split("\n\n").join(" | ").split("\n").join(", ")
}
