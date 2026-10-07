import type { EventStatus } from "~/definitions/database"
import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_ICONS,
  EVENT_STATUS_LABELS,
  type EventStatusIcon,
} from "~/definitions/events/ui"

export type EventCardStatusStyle = EventStatusIcon & {
  /** The band renders it uppercase */
  label: string
  bandClassName: string
  cardClassName: string
  titleClassName: string
}

const DEFAULT_CARD = "border border-border bg-card"
const DEFAULT_TITLE = "font-semibold text-foreground"

const COMPLETE_CARD = "border border-border bg-status-complete-card-bg"
const COMPLETE_TITLE = "font-medium text-status-complete-fg"

const CARD_STATUS: Record<EventStatus, Pick<EventCardStatusStyle, "cardClassName" | "titleClassName">> = {
  new_lead: { cardClassName: "border-2 border-status-new-border bg-card", titleClassName: DEFAULT_TITLE },
  tentative: { cardClassName: DEFAULT_CARD, titleClassName: DEFAULT_TITLE },
  confirmed: { cardClassName: DEFAULT_CARD, titleClassName: DEFAULT_TITLE },
  closed: { cardClassName: COMPLETE_CARD, titleClassName: COMPLETE_TITLE },
  // Not covered by the card spec: recedes like Complete, told apart by label and icon.
  lost: { cardClassName: COMPLETE_CARD, titleClassName: COMPLETE_TITLE },
}

/** Status drives the card's header band; band colours and icons are shared with other status badges. */
export const EVENT_CARD_STATUS_STYLES = Object.fromEntries(
  (Object.keys(CARD_STATUS) as EventStatus[]).map((status) => [
    status,
    {
      ...CARD_STATUS[status],
      ...EVENT_STATUS_ICONS[status],
      label: EVENT_STATUS_LABELS[status],
      bandClassName: EVENT_STATUS_COLORS[status],
    },
  ]),
) as Record<EventStatus, EventCardStatusStyle>
