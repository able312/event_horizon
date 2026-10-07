import { Check, CircleCheck, CircleDashed, CircleX, Sparkle, type LucideIcon } from "lucide-react"
import type { EventStatus } from "~/definitions/database"

export type EventCardStatusStyle = {
  /** Sentence case; the band renders it uppercase */
  label: string
  Icon: LucideIcon
  iconClassName?: string
  bandClassName: string
  cardClassName: string
  titleClassName: string
}

const DEFAULT_CARD = "border border-border bg-card"
const DEFAULT_TITLE = "font-semibold text-foreground"

const COMPLETE_CARD = "border border-border bg-status-complete-card-bg"
const COMPLETE_BAND = "bg-status-complete-bg text-status-complete-fg"
const COMPLETE_TITLE = "font-medium text-status-complete-fg"

/**
 * Status drives the card's header band. New lead is the only solid dark band;
 * keep it that way so leads stand out.
 */
export const EVENT_CARD_STATUS_STYLES: Record<EventStatus, EventCardStatusStyle> = {
  new_lead: {
    label: "New lead",
    Icon: Sparkle,
    iconClassName: "fill-current",
    bandClassName: "bg-status-new-bg text-status-new-fg",
    cardClassName: "border-2 border-status-new-border bg-card",
    titleClassName: DEFAULT_TITLE,
  },
  tentative: {
    label: "Tentative",
    Icon: CircleDashed,
    bandClassName: "bg-status-tentative-bg text-status-tentative-fg",
    cardClassName: DEFAULT_CARD,
    titleClassName: DEFAULT_TITLE,
  },
  confirmed: {
    label: "Confirmed",
    Icon: CircleCheck,
    bandClassName: "bg-status-confirmed-bg text-status-confirmed-fg",
    cardClassName: DEFAULT_CARD,
    titleClassName: DEFAULT_TITLE,
  },
  closed: {
    label: "Complete",
    Icon: Check,
    bandClassName: COMPLETE_BAND,
    cardClassName: COMPLETE_CARD,
    titleClassName: COMPLETE_TITLE,
  },
  // Not covered by the card spec: recedes like Complete, told apart by label and icon.
  lost: {
    label: "Lost",
    Icon: CircleX,
    bandClassName: COMPLETE_BAND,
    cardClassName: COMPLETE_CARD,
    titleClassName: COMPLETE_TITLE,
  },
}
