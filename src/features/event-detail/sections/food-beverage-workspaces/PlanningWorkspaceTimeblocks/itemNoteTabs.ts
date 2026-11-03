import { hasText } from "~/lib/utils"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"

/** "client" is what the client may see; "internal" is the kitchen/staff-only note. */
export type ItemNoteTab = "client" | "internal"

export const ITEM_NOTE_FIELDS = {
  client: "clientNotes",
  internal: "internalNotes",
} as const satisfies Record<ItemNoteTab, keyof WorkspaceItemBase>

/**
 * The kitchen tab stays a dim "Add kitchen note…" prompt until it has a note or is the
 * open tab, so items without a kitchen note look like they did before the split.
 */
export function showsInternalNotePrompt(internalNote: string, activeTab: ItemNoteTab): boolean {
  return activeTab !== "internal" && !hasText(internalNote)
}

/** The tab an arrow, Home or End key moves to from `current`, or null for any other key. */
export function otherTabForKey(key: string, current: ItemNoteTab): ItemNoteTab | null {
  if (key === "Home") return "client"
  if (key === "End") return "internal"
  if (key === "ArrowLeft" || key === "ArrowRight") return current === "client" ? "internal" : "client"
  return null
}

/** One-line preview of a note: blank lines become " | ", other line breaks ", ". */
export function toNotePreview(note: string): string {
  return note.split("\n\n").join(" | ").split("\n").join(", ")
}
