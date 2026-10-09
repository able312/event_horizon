import { infiniteQueryOptions, queryOptions, type QueryKey } from "@tanstack/react-query"

import type { ContactRoleType } from "~/definitions/contacts"
import type { EventSearchRequest } from "~/definitions/ipc"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import * as beverageItemsApi from "./beverageItems"
import * as cartDetailsApi from "./cartDetails"
import * as contactRolesApi from "./contactRoles"
import * as contactsApi from "./contacts"
import * as eventContactsApi from "./eventContacts"
import * as eventsApi from "./events"
import * as foodItemsApi from "./foodItems"
import * as menuOfChargeItemsApi from "./menuOfChargeItems"
import * as paymentsApi from "./payments"
import * as timeblocksApi from "./timeblocks"
import * as touchpointsApi from "./touchpoints"
import * as tournamentDetailsApi from "./tournamentDetails"
import * as vendorCategoriesApi from "./vendorCategories"
import { liveMeta, livePagesMeta } from "./liveQueries"
import { sources } from "./sources"

// Every cached read in the app: its cache key, how it is fetched, and the Convex
// query that keeps it live (`liveMeta`, see liveQueries.ts). Hooks build on these
// and use the key factories for optimistic updates and invalidation, so a backend
// swap only changes this folder. Live reads never go stale; other people's changes
// arrive through the subscription.

// ============================================================================
// Events
// ============================================================================

export const eventKeys = {
  byId: (id: string) => ["event", id] as const,
  /** Prefix of every month list. */
  months: () => ["events", "month"] as const,
  /** `month` must already be normalized to YYYY-MM. */
  month: (month: string) => [...eventKeys.months(), month] as const,
  unscheduled: () => ["events", "unscheduled"] as const,
  /** Prefix of every search result page. */
  searches: () => ["events", "search"] as const,
  search: (params: EventSearchRequest) => [
    ...eventKeys.searches(),
    params.query,
    params.type,
    params.status,
    params.startFrom,
    params.startTo,
    params.page,
    params.pageSize,
  ] as const,
}

export const eventQueries = {
  byId: (id: string) => queryOptions({
    queryKey: eventKeys.byId(id),
    queryFn: () => eventsApi.getEventById(id),
    ...liveMeta(sources.events.byId(id)),
  }),
  month: (month: string) => queryOptions({
    queryKey: eventKeys.month(month),
    queryFn: () => eventsApi.getEventsByMonth(month),
    ...liveMeta(sources.events.month(month)),
  }),
  unscheduled: () => queryOptions({
    queryKey: eventKeys.unscheduled(),
    queryFn: () => eventsApi.getUnscheduledEvents(),
    ...liveMeta(sources.events.unscheduled()),
  }),
  search: (params: EventSearchRequest) => queryOptions({
    queryKey: eventKeys.search(params),
    queryFn: () => eventsApi.searchEvents(params),
    ...liveMeta(sources.events.search(params)),
  }),
}

// ============================================================================
// Event details
// ============================================================================

export const touchpointKeys = {
  byEvent: (eventId: string) => ["touchpoints", eventId] as const,
  incomplete: () => ["touchpoints", "incomplete"] as const,
}

export const touchpointQueries = {
  byEvent: (eventId: string) => queryOptions({
    queryKey: touchpointKeys.byEvent(eventId),
    queryFn: () => touchpointsApi.getTouchpointsByEventId(eventId),
    ...liveMeta(sources.touchpoints.byEvent(eventId)),
  }),
  incomplete: () => queryOptions({
    queryKey: touchpointKeys.incomplete(),
    queryFn: () => touchpointsApi.getIncompleteTouchpoints(),
    ...liveMeta(sources.touchpoints.incomplete()),
  }),
}

export const paymentKeys = {
  byEvent: (eventId: string) => ["payments", eventId] as const,
}

export const paymentQueries = {
  byEvent: (eventId: string) => queryOptions({
    queryKey: paymentKeys.byEvent(eventId),
    queryFn: () => paymentsApi.getPaymentsByEventId(eventId),
    ...liveMeta(sources.payments.byEvent(eventId)),
  }),
}

export const menuOfChargeItemKeys = {
  byEvent: (eventId: string) => ["menuOfChargeItems", eventId] as const,
}

export const menuOfChargeItemQueries = {
  byEvent: (eventId: string) => queryOptions({
    queryKey: menuOfChargeItemKeys.byEvent(eventId),
    queryFn: () => menuOfChargeItemsApi.getMenuOfChargeItemsByEventId(eventId),
    ...liveMeta(sources.menuOfChargeItems.byEvent(eventId)),
  }),
}

export const cartDetailsKeys = {
  byEvent: (eventId: string) => ["cart_details", eventId] as const,
}

export const cartDetailsQueries = {
  /**
   * Creates the event's cart details on first read (an idempotent mutation that
   * returns the same record the read query does), then follows that query live.
   */
  byEvent: (eventId: string) => queryOptions({
    queryKey: cartDetailsKeys.byEvent(eventId),
    queryFn: () => cartDetailsApi.getOrCreateCartDetailsByEventId(eventId),
    ...liveMeta(sources.cartDetails.byEvent(eventId)),
  }),
}

export const tournamentDetailsKeys = {
  byEvent: (eventId: string) => ["tournament_details", eventId] as const,
}

export const tournamentDetailsQueries = {
  /** Creates the event's tournament details on first read, then follows them live (as cart details). */
  byEvent: (eventId: string) => queryOptions({
    queryKey: tournamentDetailsKeys.byEvent(eventId),
    queryFn: () => tournamentDetailsApi.getOrCreateTournamentDetailsByEventId(eventId),
    ...liveMeta(sources.tournamentDetails.byEvent(eventId)),
  }),
}

// ============================================================================
// Timeblocks and their sections
// ============================================================================

export const timeblockKeys = {
  /** The event's timeline: every timed block plus system rows. */
  timeline: (eventId: string) => ["timeblocks", eventId] as const,
  byId: (timeblockId: string) => ["timeblock", timeblockId] as const,
  notes: (eventId: string) => ["note", eventId] as const,
  setupInstructions: (eventId: string) => ["setupInstructions", eventId] as const,
  foodSection: (eventId: string) => ["foodSection", eventId] as const,
  beverageSection: (eventId: string) => ["beverageSection", eventId] as const,
  /** The section list that shows blocks of this type, or null when no section lists them. */
  section: (sectionType: TimeblockType, eventId: string): QueryKey | null => {
    switch (sectionType) {
      case "note":
        return timeblockKeys.notes(eventId)
      case "setup_instruction":
        return timeblockKeys.setupInstructions(eventId)
      case "food":
        return timeblockKeys.foodSection(eventId)
      case "beverage":
        return timeblockKeys.beverageSection(eventId)
      default:
        return null
    }
  },
}

export const timeblockQueries = {
  timeline: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.timeline(eventId),
    queryFn: () => timeblocksApi.getAllTimelineBlocks(eventId),
    ...liveMeta(sources.timeblocks.timeline(eventId)),
  }),
  byId: (timeblockId: string) => queryOptions({
    queryKey: timeblockKeys.byId(timeblockId),
    queryFn: () => timeblocksApi.getTimeblockById(timeblockId),
    ...liveMeta(sources.timeblocks.byId(timeblockId)),
  }),
  notes: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.notes(eventId),
    queryFn: () => timeblocksApi.getTimeblocksByEventAndSection(eventId, "note"),
    ...liveMeta(sources.timeblocks.bySection(eventId, "note")),
  }),
  setupInstructions: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.setupInstructions(eventId),
    queryFn: () => timeblocksApi.getTimeblocksByEventAndSection(eventId, "setup_instruction"),
    ...liveMeta(sources.timeblocks.bySection(eventId, "setup_instruction")),
  }),
  foodSection: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.foodSection(eventId),
    queryFn: () => foodItemsApi.getFoodSectionWithItems(eventId),
    ...liveMeta(sources.timeblocks.foodSection(eventId)),
  }),
  beverageSection: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.beverageSection(eventId),
    queryFn: () => beverageItemsApi.getBeverageSectionWithItems(eventId),
    ...liveMeta(sources.timeblocks.beverageSection(eventId)),
  }),
}

// ============================================================================
// Contacts
// ============================================================================

export type ContactSearchParams = {
  query: string
  role: ContactRoleType | null
  includeArchived: boolean
  limit: number
}

export const eventContactKeys = {
  /** Every event's panel plus the primary-clients batches. */
  all: () => ["event-contacts"] as const,
  panel: (eventId: string) => [...eventContactKeys.all(), eventId] as const,
  /** Prefix of every primary-clients batch; any contact change on any event can affect them. */
  primaryClients: () => [...eventContactKeys.all(), "primary-clients"] as const,
  /** `eventIds` must be de-duplicated and sorted. */
  primaryClientsFor: (eventIds: string[]) => [...eventContactKeys.primaryClients(), eventIds] as const,
}

export const eventContactQueries = {
  panel: (eventId: string) => queryOptions({
    queryKey: eventContactKeys.panel(eventId),
    queryFn: () => eventContactsApi.getEventContactsPanel(eventId),
    ...liveMeta(sources.eventContacts.panel(eventId)),
  }),
  /** `eventIds` must be de-duplicated and sorted. */
  primaryClients: (eventIds: string[]) => queryOptions({
    queryKey: eventContactKeys.primaryClientsFor(eventIds),
    queryFn: () => eventContactsApi.getPrimaryClients(eventIds),
    ...liveMeta(sources.eventContacts.primaryClients(eventIds)),
  }),
}

function toContactSearchRequest(params: ContactSearchParams, cursor: string | null) {
  return {
    query: params.query,
    limit: params.limit,
    cursor,
    role: params.role ?? undefined,
    includeArchived: params.includeArchived,
  }
}

export const contactKeys = {
  /** The whole directory: search results, by-id lookups, standing roles and event history. */
  all: () => ["contacts"] as const,
  search: (params: ContactSearchParams) => [
    ...contactKeys.all(),
    "search",
    params.query,
    params.role,
    params.includeArchived,
    params.limit,
  ] as const,
  directory: (params: ContactSearchParams) => [
    ...contactKeys.all(),
    "directory",
    params.query,
    params.role,
    params.includeArchived,
    params.limit,
  ] as const,
  byId: (contactId: string) => [...contactKeys.all(), "by-id", contactId] as const,
  roles: (contactId: string) => [...contactKeys.all(), "roles", contactId] as const,
  history: (contactId: string) => [...contactKeys.all(), "history", contactId] as const,
}

export const contactQueries = {
  search: (params: ContactSearchParams) => queryOptions({
    queryKey: contactKeys.search(params),
    queryFn: () => contactsApi.searchContacts(toContactSearchRequest(params, null)),
    ...liveMeta(sources.contacts.search(toContactSearchRequest(params, null))),
  }),
  /**
   * Loads one page at a time; the page param is the opaque next cursor, valid only
   * for these params (a new filter is a new key, so it starts from the first page).
   * When any loaded page changes, every page is refetched from the first, so pages
   * never overlap or skip contacts that moved between them.
   */
  directory: (params: ContactSearchParams) => infiniteQueryOptions({
    queryKey: contactKeys.directory(params),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => contactsApi.searchContacts(toContactSearchRequest(params, pageParam)),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    ...livePagesMeta((cursor: string | null) => sources.contacts.search(toContactSearchRequest(params, cursor))),
  }),
  byId: (contactId: string) => queryOptions({
    queryKey: contactKeys.byId(contactId),
    queryFn: () => contactsApi.getContactById(contactId),
    ...liveMeta(sources.contacts.byId(contactId)),
  }),
  roles: (contactId: string) => queryOptions({
    queryKey: contactKeys.roles(contactId),
    queryFn: () => contactRolesApi.getContactRoles(contactId),
    ...liveMeta(sources.contacts.roles(contactId)),
  }),
  history: (contactId: string) => queryOptions({
    queryKey: contactKeys.history(contactId),
    queryFn: () => eventContactsApi.getContactEventHistory(contactId),
    ...liveMeta(sources.eventContacts.history(contactId)),
  }),
}

export const vendorCategoryKeys = {
  all: () => ["vendor-categories"] as const,
}

export const vendorCategoryQueries = {
  all: () => queryOptions({
    queryKey: vendorCategoryKeys.all(),
    queryFn: () => vendorCategoriesApi.getVendorCategories(),
    ...liveMeta(sources.vendorCategories.all()),
  }),
}
