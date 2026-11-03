import { hasText } from "~/lib/utils"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"

/** One item's block in "Port to Setup", leaving out a missing service style or note. */
export function toSetupInstructionEntry(item: Pick<WorkspaceItemBase, "name" | "serviceStyle" | "clientNotes">): string {
  const lines = [`## ${item.name}`]
  if (item.serviceStyle) lines.push(`# ${item.serviceStyle}`)
  if (hasText(item.clientNotes)) lines.push(item.clientNotes)
  return `${lines.join("\n")}\n\n`
}
