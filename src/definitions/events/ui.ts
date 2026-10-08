import { Check, CircleCheck, CircleDashed, CircleX, Sparkle, type LucideIcon } from "lucide-react"
import type { EventType, EventStatus } from "~/definitions/database"

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: "Tournament",
  wedding: "Wedding",
  function: "Function",
}
export const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  tournament: "bg-green-50 text-green-700 border border-green-200",
  wedding: "bg-purple-100 text-purple-700 border border-purple-200",
  function: "bg-yellow-100 text-yellow-700 border border-yellow-200",
}

export const EVENT_TYPE_DOT_COLORS: Record<EventType, string> = {
  tournament: "bg-green-500",
  wedding: "bg-purple-500",
  function: "bg-yellow-500",
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  new_lead: "New Lead",
  tentative: "Tentative",
  confirmed: "Confirmed",
  closed: "Complete",
  lost: "Lost",
}

/** Status colours come from the --status-* theme tokens. New lead is the only solid dark fill so leads stand out. */
export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  new_lead: "bg-status-new-bg text-status-new-fg",
  tentative: "bg-status-tentative-bg text-status-tentative-fg",
  confirmed: "bg-status-confirmed-bg text-status-confirmed-fg",
  closed: "bg-status-complete-bg text-status-complete-fg",
  lost: "bg-status-complete-bg text-status-complete-fg",
}

export type EventStatusIcon = {
  Icon: LucideIcon
  className?: string
}

export const EVENT_STATUS_ICONS: Record<EventStatus, EventStatusIcon> = {
  new_lead: { Icon: Sparkle, className: "fill-current" },
  tentative: { Icon: CircleDashed },
  confirmed: { Icon: CircleCheck },
  closed: { Icon: Check },
  lost: { Icon: CircleX },
}
