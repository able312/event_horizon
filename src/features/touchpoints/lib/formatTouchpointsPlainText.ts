import type { TouchpointPlainItem } from "../types"

import { parseStoredDueDate } from "./storedDueDate"

// A fixed locale, not the machine's: the Google Calendar copy is built in Convex, and it
// should match what anyone on the team gets from the clipboard copy
const DUE_DATE_LOCALE = "en-CA"

function formatDueDate(dueDate: string | null): string | null {
  const parsed = parseStoredDueDate(dueDate)
  if (!parsed) return null
  return parsed.toLocaleDateString(DUE_DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function sortByDueDateAsc(a: TouchpointPlainItem, b: TouchpointPlainItem): number {
  if (!a.dueDate && !b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  return a.dueDate.localeCompare(b.dueDate)
}

/** Shared plain-text block for clipboard copy and Google Calendar details. */
export function formatTouchpointsPlainText(items: TouchpointPlainItem[]): string {
  if (items.length === 0) return ""

  const lines = ["TOUCHPOINTS"]
  for (const item of [...items].sort(sortByDueDateAsc)) {
    const title = item.title.trim() || "Untitled touchpoint"
    const dateLabel = formatDueDate(item.dueDate)
    lines.push(dateLabel ? `- ${title} — ${dateLabel}` : `- ${title}`)
  }

  return lines.join("\n")
}
