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
  contacted: "Contacted",
  ready_for_estimate: "Ready for Estimate",
  estimate_sent: "Estimate Sent",
  estimate_confirmed: "Estimate Confirmed",
  agreement_sent: "Agreement Sent",
  agreement_and_deposit_received: "Agreement & Deposit Received",
  planning: "Planning",
  details_locked: "Details Locked",
  event_complete: "Event Complete",
  invoice_sent: "Invoice Sent",
  paid_in_full: "Paid in Full",
  closed: "Closed",
  lost: "Lost",
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  new_lead: "bg-red-50 text-red-700 border border-red-200",
  contacted: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ready_for_estimate: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  estimate_sent: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  estimate_confirmed: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  agreement_sent: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  agreement_and_deposit_received: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  planning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  details_locked: "bg-green-50 text-green-700 border border-green-200",
  event_complete: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  invoice_sent: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  paid_in_full: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  closed: "bg-green-50 text-green-700 border border-green-200",
  lost: "bg-red-50 text-red-700 border border-red-200",
}
