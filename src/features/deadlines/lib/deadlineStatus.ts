import { AlertCircle, Circle } from "lucide-react"

import type { DeadlineStatus, StatusStyle } from "../types"

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysFromToday(deadlineDate: Date, now = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (startOfDay(deadlineDate).getTime() - startOfDay(now).getTime()) / msPerDay
  )
}

export function getDeadlineStatus(deadlineDate: Date, now = new Date()): DeadlineStatus {
  const diff = daysFromToday(deadlineDate, now)
  if (diff < 0) return "past due"
  if (diff === 0) return "due today"
  if (diff <= 3) return "upcoming"
  return "standard"
}

export const STATUS_STYLES: Record<DeadlineStatus, StatusStyle> = {
  standard: {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground",
    rowClassName: "flex items-center gap-3 py-2.5",
    labelClassName: "text-sm font-medium",
  },
  upcoming: {
    Icon: Circle,
    iconClassName: "shrink-0 text-orange-500",
    rowClassName: "flex items-center gap-3 rounded-xs bg-orange-50/60 px-1 -mx-1 py-2.5",
    labelClassName: "text-sm font-medium",
    badge: {
      text: "Upcoming",
      className: "rounded-xs bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700",
    },
  },
  "due today": {
    Icon: AlertCircle,
    iconClassName: "shrink-0 text-orange-600",
    rowClassName: "flex items-center gap-3 rounded-xs bg-orange-100 px-2 -mx-2 py-2.5",
    labelClassName: "text-sm font-semibold text-orange-900",
    badge: {
      text: "Due today",
      className: "rounded-xs bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white",
    },
  },
  "past due": {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground/50",
    rowClassName: "flex items-center gap-3 py-2.5 opacity-80",
    labelClassName: "text-sm font-medium text-muted-foreground",
    badge: {
      text: "Past due",
      className: "rounded-xs bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    },
  },
}
