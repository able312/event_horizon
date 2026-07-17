import type { TouchpointPlainItem } from "../types"

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null
  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) return null
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
