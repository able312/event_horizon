import { events } from "~/electron/db/schema"

import type { EventType, EventStatus } from "~/definitions/database"


// Event Type
export const ITER_EVENT_TYPES = events.type.enumValues

type EventTypeMapping = {
  [K in Uppercase<EventType>]: EventType;
};
export const EVENT_TYPE = {
  FUNCTION: "function",
  WEDDING: "wedding",
  TOURNAMENT: "tournament"
} as const satisfies EventTypeMapping


// Event Status
export const ITER_EVENT_STATUSES = events.status.enumValues
type EventStatusMapping = {
  [K in Uppercase<EventStatus>]: EventStatus;
};
export const EVENT_STATUS = {
  NEW_LEAD: "new_lead",
  CONTACTED: "contacted",
  READY_FOR_ESTIMATE: "ready_for_estimate",
  ESTIMATE_SENT: "estimate_sent",
  ESTIMATE_CONFIRMED: "estimate_confirmed",
  AGREEMENT_SENT: "agreement_sent",
  AGREEMENT_AND_DEPOSIT_RECEIVED: "agreement_and_deposit_received",
  PLANNING: "planning",
  DETAILS_LOCKED: "details_locked",
  EVENT_COMPLETE: "event_complete",
  INVOICE_SENT: "invoice_sent",
  PAID_IN_FULL: "paid_in_full",
  CLOSED: "closed",
  LOST: "lost"
} as const satisfies EventStatusMapping