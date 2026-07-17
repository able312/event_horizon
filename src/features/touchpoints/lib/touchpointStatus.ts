import { AlertCircle, Circle } from "lucide-react"

import type { StatusStyle, TouchpointUrgency } from "../types"

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Stored due dates are UTC-midnight ISO; map to a local calendar day for urgency. */
export function parseStoredDueDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    12,
    0,
    0,
  )
}

export function daysFromToday(dueDate: Date, now = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(now).getTime()) / msPerDay
  )
}

export function getTouchpointUrgency(dueDate: Date, now = new Date()): TouchpointUrgency {
  const diff = daysFromToday(dueDate, now)
  if (diff < 0) return "past due"
  if (diff === 0) return "due today"
  if (diff <= 3) return "upcoming"
  return "standard"
}

export function getTouchpointUrgencyFromStored(
  dueDateIso: string | null | undefined,
  now = new Date(),
): TouchpointUrgency | null {
  const dueDate = parseStoredDueDate(dueDateIso)
  if (!dueDate) return null
  return getTouchpointUrgency(dueDate, now)
}

export const URGENCY_STYLES: Record<TouchpointUrgency, StatusStyle> = {
  standard: {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground",
    rowClassName: "group flex items-center gap-3 py-2.5",
    labelClassName: "text-sm font-medium",
  },
  upcoming: {
    Icon: Circle,
    iconClassName: "shrink-0 text-orange-500",
    rowClassName: "group flex items-center gap-3 rounded-xs bg-orange-50/60 px-1 -mx-1 py-2.5",
    labelClassName: "text-sm font-medium",
    badge: {
      text: "Upcoming",
      className: "rounded-xs bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700",
    },
  },
  "due today": {
    Icon: AlertCircle,
    iconClassName: "shrink-0 text-orange-600",
    rowClassName: "group flex items-center gap-3 rounded-xs bg-orange-100 px-2 -mx-2 py-2.5",
    labelClassName: "text-sm font-semibold text-orange-900",
    badge: {
      text: "Due today",
      className: "rounded-xs bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white",
    },
  },
  "past due": {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground/50",
    rowClassName: "group flex items-center gap-3 py-2.5 opacity-80",
    labelClassName: "text-sm font-medium text-muted-foreground",
    badge: {
      text: "Past due",
      className: "rounded-xs bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    },
  },
}
