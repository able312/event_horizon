import type { EventStatus, EventType } from "../database.js"

// Plain-text labels, kept apart from ui.ts (icons and classes) so Convex functions can use them.

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: "Tournament",
  wedding: "Wedding",
  function: "Function",
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  new_lead: "New Lead",
  tentative: "Tentative",
  confirmed: "Confirmed",
  closed: "Complete",
  lost: "Lost",
}
