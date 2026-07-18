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

/** Short relative due label for the calendar sidebar (e.g. Today, 3 days late, Jul 19). */
export function formatSidebarDueLabel(dueDate: Date, now = new Date()): string {
  const diff = daysFromToday(dueDate, now)
  if (diff === 0) return "Today"
  if (diff === -1) return "1 day late"
  if (diff < -1) return `${Math.abs(diff)} days late`
  if (diff === 1) return "Tomorrow"
  if (diff <= 3) return `In ${diff} days`
  return dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatSidebarDueLabelFromStored(
  dueDateIso: string | null | undefined,
  now = new Date(),
): string | null {
  const dueDate = parseStoredDueDate(dueDateIso)
  if (!dueDate) return null
  return formatSidebarDueLabel(dueDate, now)
}

export const URGENCY_STYLES: Record<TouchpointUrgency, StatusStyle> = {
  standard: {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground",
    rowClassName: "group flex flex-col gap-0.5 border-l-2 border-transparent py-2.5 pl-2",
    labelClassName: "text-sm font-medium",
  },
  upcoming: {
    Icon: Circle,
    iconClassName: "shrink-0 text-stone-500",
    rowClassName:
      "group flex flex-col gap-0.5 border-l-2 border-stone-400 bg-stone-50/70 py-2.5 pl-2",
    labelClassName: "text-sm font-medium",
    badge: {
      text: "Upcoming",
      className: "rounded-xs bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700",
    },
  },
  "due today": {
    Icon: AlertCircle,
    iconClassName: "shrink-0 text-orange-600",
    rowClassName:
      "group flex flex-col gap-0.5 border-l-2 border-orange-400 bg-orange-50 py-2.5 pl-2",
    labelClassName: "text-sm font-semibold text-orange-900",
    badge: {
      text: "Due today",
      className: "rounded-xs bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white",
    },
  },
  "past due": {
    Icon: AlertCircle,
    iconClassName: "shrink-0 text-red-600",
    rowClassName:
      "group flex flex-col gap-0.5 border-l-2 border-red-400 bg-red-50/80 py-2.5 pl-2",
    labelClassName: "text-sm font-semibold text-red-900",
    badge: {
      text: "Past due",
      className: "rounded-xs bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700",
    },
  },
}
