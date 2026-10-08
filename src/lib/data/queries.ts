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

// Every cached read in the app: its cache key and how it is fetched.
// Hooks build on these and use the key factories for optimistic updates and
// invalidation, so a backend swap only changes this folder.

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
  }),
  month: (month: string) => queryOptions({
    queryKey: eventKeys.month(month),
    queryFn: () => eventsApi.getEventsByMonth(month),
  }),
  unscheduled: () => queryOptions({
    queryKey: eventKeys.unscheduled(),
    queryFn: () => eventsApi.getUnscheduledEvents(),
  }),
  search: (params: EventSearchRequest) => queryOptions({
    queryKey: eventKeys.search(params),
    queryFn: () => eventsApi.searchEvents(params),
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
  }),
  incomplete: () => queryOptions({
    queryKey: touchpointKeys.incomplete(),
    queryFn: () => touchpointsApi.getIncompleteTouchpoints(),
  }),
}

export const paymentKeys = {
  byEvent: (eventId: string) => ["payments", eventId] as const,
}

export const paymentQueries = {
  byEvent: (eventId: string) => queryOptions({
    queryKey: paymentKeys.byEvent(eventId),
    queryFn: async () => {
      const payments = await paymentsApi.getAllPayments()
      return payments.filter((payment) => payment.eventId === eventId)
    },
  }),
}

export const menuOfChargeItemKeys = {
  byEvent: (eventId: string) => ["menuOfChargeItems", eventId] as const,
}

export const menuOfChargeItemQueries = {
  byEvent: (eventId: string) => queryOptions({
    queryKey: menuOfChargeItemKeys.byEvent(eventId),
    queryFn: () => menuOfChargeItemsApi.getMenuOfChargeItemsByEventId(eventId),
  }),
}

export const cartDetailsKeys = {
  byEvent: (eventId: string) => ["cart_details", eventId] as const,
}

export const cartDetailsQueries = {
  /** Creates the event's cart details on first read. */
  byEvent: (eventId: string) => queryOptions({
    queryKey: cartDetailsKeys.byEvent(eventId),
    queryFn: () => cartDetailsApi.getOrCreateCartDetailsByEventId(eventId),
  }),
}

export const tournamentDetailsKeys = {
  byEvent: (eventId: string) => ["tournament_details", eventId] as const,
}

export const tournamentDetailsQueries = {
  /** Creates the event's tournament details on first read. */
  byEvent: (eventId: string) => queryOptions({
    queryKey: tournamentDetailsKeys.byEvent(eventId),
    queryFn: () => tournamentDetailsApi.getOrCreateTournamentDetailsByEventId(eventId),
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
  }),
  byId: (timeblockId: string) => queryOptions({
    queryKey: timeblockKeys.byId(timeblockId),
    queryFn: () => timeblocksApi.getTimeblockById(timeblockId),
  }),
  notes: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.notes(eventId),
    queryFn: () => timeblocksApi.getTimeblocksByEventAndSection(eventId, "note"),
  }),
  setupInstructions: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.setupInstructions(eventId),
    queryFn: () => timeblocksApi.getTimeblocksByEventAndSection(eventId, "setup_instruction"),
  }),
  foodSection: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.foodSection(eventId),
    queryFn: () => foodItemsApi.getFoodSectionWithItems(eventId),
  }),
  beverageSection: (eventId: string) => queryOptions({
    queryKey: timeblockKeys.beverageSection(eventId),
    queryFn: () => beverageItemsApi.getBeverageSectionWithItems(eventId),
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
  }),
  /** `eventIds` must be de-duplicated and sorted. */
  primaryClients: (eventIds: string[]) => queryOptions({
    queryKey: eventContactKeys.primaryClientsFor(eventIds),
    queryFn: () => eventContactsApi.getPrimaryClients(eventIds),
  }),
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
    queryFn: () => contactsApi.searchContacts({
      query: params.query,
      limit: params.limit,
      role: params.role ?? undefined,
      includeArchived: params.includeArchived,
    }),
  }),
  /** Loads one page at a time; the page param is the next cursor. */
  directory: (params: ContactSearchParams) => infiniteQueryOptions({
    queryKey: contactKeys.directory(params),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => contactsApi.searchContacts({
      query: params.query,
      limit: params.limit,
      cursor: pageParam,
      role: params.role ?? undefined,
      includeArchived: params.includeArchived,
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }),
  byId: (contactId: string) => queryOptions({
    queryKey: contactKeys.byId(contactId),
    queryFn: () => contactsApi.getContactById(contactId),
  }),
  roles: (contactId: string) => queryOptions({
    queryKey: contactKeys.roles(contactId),
    queryFn: () => contactRolesApi.getContactRoles(contactId),
  }),
  history: (contactId: string) => queryOptions({
    queryKey: contactKeys.history(contactId),
    queryFn: () => eventContactsApi.getContactEventHistory(contactId),
  }),
}

export const vendorCategoryKeys = {
  all: () => ["vendor-categories"] as const,
}

export const vendorCategoryQueries = {
  all: () => queryOptions({
    queryKey: vendorCategoryKeys.all(),
    queryFn: () => vendorCategoriesApi.getVendorCategories(),
  }),
}
