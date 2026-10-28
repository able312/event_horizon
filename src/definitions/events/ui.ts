import { Check, CircleCheck, CircleDashed, CircleX, Sparkle, type LucideIcon } from "lucide-react"
import type { EventType, EventStatus } from "~/definitions/database"
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "./labels"

export { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS }

export const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  tournament: "bg-green-50 text-green-700 border border-green-200",
  wedding: "bg-purple-100 text-purple-700 border border-purple-200",
  function: "bg-yellow-100 text-yellow-700 border border-yellow-200",
}

/** Status colours come from the --status-* theme tokens. New lead is the only solid dark fill so leads stand out. */
export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  new_lead: "bg-status-new-bg text-status-new-fg",
  tentative: "bg-status-tentative-bg text-status-tentative-fg",
  confirmed: "bg-status-confirmed-bg text-status-confirmed-fg",
  closed: "bg-status-complete-bg text-status-complete-fg",
  lost: "bg-status-complete-bg text-status-complete-fg",
}

/**
 * Mini calendar dots, echoing the compact chip glyphs so new lead and tentative
 * can be told apart by shape at dot size: new lead is a diamond, tentative a
 * hollow ring. Lost recedes like Complete.
 */
export const EVENT_STATUS_DOT_CLASSES: Record<EventStatus, string> = {
  new_lead: "size-[5px] rotate-45 rounded-[1px] bg-status-new-bg",
  tentative: "border-[1.5px] border-status-tentative-glyph",
  confirmed: "bg-status-confirmed-fg",
  closed: "bg-status-complete-glyph",
  lost: "bg-status-complete-glyph",
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
