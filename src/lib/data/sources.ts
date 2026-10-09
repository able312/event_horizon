import type { ContactSearchRequest } from "~/definitions/contacts"
import type { EventSearchRequest } from "~/definitions/ipc"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import { getMonthRangeUtcFromLocal } from "~/lib/months"
import { api } from "../../../convex/_generated/api"
import { toId, toIds } from "./ids"
import { liveSource } from "./liveQueries"

// Every Convex query behind a cached read, with its exact arguments. The data
// modules fetch through these and queries.ts subscribes to the same ones, so a
// cached value and its live updates always come from the same call.

/** The desktop's IANA time zone; timeline rows and seeded dates follow local time. */
export function desktopTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** `month` is YYYY-MM; the range covers the month in desktop local time. */
function monthRange(month: string) {
  const range = getMonthRangeUtcFromLocal(month)
  if (!range) throw new Error(`Invalid month: ${month}`)
  return { startFrom: range.startInclusiveIso, startTo: range.endExclusiveIso }
}

export const sources = {
  events: {
    byId: (id: string) => liveSource(api.events.getById, { id: toId<"events">(id) }),
    month: (month: string) => liveSource(api.events.getStartingBetween, monthRange(month)),
    unscheduled: () => liveSource(api.events.getUnscheduled, {}),
    search: (params: EventSearchRequest) => liveSource(api.events.search, params),
  },
  touchpoints: {
    byEvent: (eventId: string) => liveSource(api.touchpoints.getByEventId, { eventId: toId<"events">(eventId) }),
    incomplete: () => liveSource(api.touchpoints.getIncompleteWithEvent, {}),
  },
  payments: {
    byEvent: (eventId: string) => liveSource(api.payments.getByEventId, { eventId: toId<"events">(eventId) }),
  },
  menuOfChargeItems: {
    byEvent: (eventId: string) => liveSource(api.menuOfChargeItems.getByEventId, { eventId: toId<"events">(eventId) }),
  },
  cartDetails: {
    byEvent: (eventId: string) => liveSource(api.cartDetails.getByEventId, { eventId: toId<"events">(eventId) }),
  },
  tournamentDetails: {
    byEvent: (eventId: string) => liveSource(api.tournamentDetails.getByEventId, { eventId: toId<"events">(eventId) }),
  },
  timeblocks: {
    timeline: (eventId: string) => liveSource(api.timeblocks.getAllTimelineBlocks, {
      eventId: toId<"events">(eventId),
      timeZone: desktopTimeZone(),
    }),
    byId: (id: string) => liveSource(api.timeblocks.getById, { id: toId<"timeblocks">(id) }),
    bySection: (eventId: string, sectionType: TimeblockType) => liveSource(api.timeblocks.getByEventIdAndSectionType, {
      eventId: toId<"events">(eventId),
      sectionType,
    }),
    foodSection: (eventId: string) => liveSource(api.foodItems.getByEventId, { eventId: toId<"events">(eventId) }),
    beverageSection: (eventId: string) => liveSource(api.beverageItems.getByEventId, { eventId: toId<"events">(eventId) }),
  },
  eventContacts: {
    panel: (eventId: string) => liveSource(api.eventContacts.getPanel, { eventId: toId<"events">(eventId) }),
    primaryClients: (eventIds: string[]) => liveSource(api.eventContacts.getPrimaryClients, {
      eventIds: toIds<"events">(eventIds),
    }),
    history: (contactId: string) => liveSource(api.eventContacts.listEventsForContact, {
      contactId: toId<"contacts">(contactId),
    }),
  },
  contacts: {
    byId: (id: string) => liveSource(api.contacts.getById, { id: toId<"contacts">(id) }),
    search: (params: ContactSearchRequest) => liveSource(api.contacts.search, {
      limit: params.limit,
      ...(params.query !== undefined ? { query: params.query } : {}),
      ...(params.role ? { role: params.role } : {}),
      ...(params.vendorCategoryId ? { vendorCategoryId: toId<"vendorCategories">(params.vendorCategoryId) } : {}),
      ...(params.includeArchived !== undefined ? { includeArchived: params.includeArchived } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
    }),
    roles: (contactId: string) => liveSource(api.contactRoles.listForContact, { contactId: toId<"contacts">(contactId) }),
  },
  vendorCategories: {
    all: (options?: { includeArchived?: boolean }) => liveSource(api.vendorCategories.getAll, {
      ...(options?.includeArchived !== undefined ? { includeArchived: options.includeArchived } : {}),
    }),
  },
}
