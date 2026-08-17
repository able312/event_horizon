import type { TouchpointPlainItem } from "../types"

import { parseStoredDueDate } from "./touchpointStatus"

function formatDueDate(dueDate: string | null): string | null {
  const parsed = parseStoredDueDate(dueDate)
  if (!parsed) return null
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** Shared plain-text block for clipboard copy and Google Calendar details. */
export function formatTouchpointsPlainText(items: TouchpointPlainItem[]): string {
  if (items.length === 0) return ""

  const lines = ["TOUCHPOINTS"]
  for (const item of items) {
    const title = item.title.trim() || "Untitled touchpoint"
    const dateLabel = formatDueDate(item.dueDate)
    lines.push(dateLabel ? `- ${title} — ${dateLabel}` : `- ${title}`)
  }

  return lines.join("\n")
}
