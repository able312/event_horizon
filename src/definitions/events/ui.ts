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
  closed: "Closed",
  lost: "Lost",
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  new_lead: "bg-red-50 text-red-700 border border-red-200",
  tentative: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  closed: "bg-stone-100 text-stone-700 border border-stone-200",
  lost: "bg-red-50 text-red-700 border border-red-200",
}
