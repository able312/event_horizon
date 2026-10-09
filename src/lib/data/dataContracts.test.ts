import { beforeEach, describe, expect, it, vi } from "vitest"
import { getFunctionName } from "convex/server"
import * as backend from "./backend"
import * as events from "./events"
import * as timeblocks from "./timeblocks"
import * as beverage from "./beverageItems"
import * as food from "./foodItems"
import * as cart from "./cartDetails"
import * as tournament from "./tournamentDetails"
import * as contacts from "./contacts"
import * as touchpoints from "./touchpoints"
import * as payments from "./payments"
import * as charges from "./menuOfChargeItems"
import * as assignments from "./eventContacts"
import * as roles from "./contactRoles"
import * as categories from "./vendorCategories"
import * as users from "./users"
import { desktopTimeZone } from "./sources"
import { getMonthRangeUtcFromLocal } from "~/lib/months"

vi.mock("./backend", async (original) => ({
  ...await original<typeof backend>(),
  runMutation: vi.fn(), runQuery: vi.fn(), fetchSource: vi.fn(),
}))

type Contract = { name: string; kind: "mutation" | "query" | "source"; call: () => Promise<unknown>; args: object; voidResult?: boolean }
const eventId = "event-1", id = "record-1", timeblockId = "block-1"
const month = getMonthRangeUtcFromLocal("2026-04")!
const input = { title: "Dinner", type: "function" as const }
const person = { firstName: "Sam", email: "sam@example.test" }
const search = { query: "dinner", page: 0, pageSize: 20, type: null, status: null, startFrom: null, startTo: null }
const contracts: Contract[] = [
  { name: "events.getStartingBetween", kind: "source", call: () => events.getEventsByMonth("2026-04"), args: { startFrom: month.startInclusiveIso, startTo: month.endExclusiveIso } },
  { name: "events.getUnscheduled", kind: "source", call: () => events.getUnscheduledEvents(), args: {} },
  { name: "events.getById", kind: "source", call: () => events.getEventById(id), args: { id } },
  { name: "events.search", kind: "source", call: () => events.searchEvents(search), args: search },
  { name: "events.create", kind: "mutation", call: () => events.createEvent({ ...input, id, createdAt: "old" }, person), args: { input, client: person } },
  { name: "events.create", kind: "mutation", call: () => events.createEvent({ ...input, id, createdAt: "old" }), args: { input, client: null } },
  { name: "events.update", kind: "mutation", call: () => events.updateEvent(id, { title: "New", updatedAt: "old" }), args: { id, updates: { title: "New" } } },
  { name: "events.update", kind: "mutation", call: () => events.updateEvent(id, { title: "New", updatedBy: "forged" } as Parameters<typeof events.updateEvent>[1]), args: { id, updates: { title: "New" } } },
  { name: "events.remove", kind: "mutation", call: () => events.deleteEvent(id), args: { id } },
  { name: "events.getByCalendarIds", kind: "query", call: () => events.getEventsByCalendarIds(["uid"]), args: { calendarIds: ["uid"] } },
  { name: "events.getStartingBetween", kind: "query", call: () => events.getEventsStartingBetween("start", "end"), args: { startFrom: "start", startTo: "end" } },
  { name: "events.importFromCalendar", kind: "mutation", call: () => events.importCalendarEvents([]), args: { rows: [] } },
  { name: "timeblocks.getByEventIdAndSectionType", kind: "source", call: () => timeblocks.getTimeblocksByEventAndSection(eventId, "note"), args: { eventId, sectionType: "note" } },
  { name: "timeblocks.getById", kind: "source", call: () => timeblocks.getTimeblockById(id), args: { id } },
  { name: "timeblocks.getAllTimelineBlocks", kind: "source", call: () => timeblocks.getAllTimelineBlocks(eventId), args: { eventId, timeZone: desktopTimeZone() } },
  { name: "timeblocks.create", kind: "mutation", call: () => timeblocks.createTimeblock({ eventId, sectionType: "note", title: "Note" }), args: { eventId, sectionType: "note", title: "Note" } },
  { name: "timeblocks.update", kind: "mutation", call: () => timeblocks.updateTimeblock(id, { details: "New", assignedTo: undefined }), args: { id, updates: { details: "New" } } },
  { name: "timeblocks.inspectConversion", kind: "query", call: () => timeblocks.inspectTimeblockConversion({ timeblockId, toType: "food" }), args: { timeblockId, toType: "food" } },
  { name: "timeblocks.convertSectionType", kind: "mutation", call: () => timeblocks.convertTimeblockSectionType({ timeblockId, toType: "note", confirmDestructive: true }), args: { timeblockId, toType: "note", confirmDestructive: true } },
  { name: "timeblocks.remove", kind: "mutation", call: () => timeblocks.deleteTimeblock(id), args: { id } },
  { name: "cartDetails.ensureByEventId", kind: "mutation", call: () => cart.getOrCreateCartDetailsByEventId(eventId), args: { eventId } },
  { name: "cartDetails.update", kind: "mutation", call: () => cart.updateCartDetails(id, { time: "12:00", eventId }), args: { id, updates: { time: "12:00" } } },
  { name: "tournamentDetails.ensureByEventId", kind: "mutation", call: () => tournament.getOrCreateTournamentDetailsByEventId(eventId), args: { eventId } },
  { name: "tournamentDetails.update", kind: "mutation", call: () => tournament.updateTournamentDetails(id, { notes: "New", eventId }), args: { id, updates: { notes: "New" } } },
  { name: "beverageItems.getByEventId", kind: "source", call: () => beverage.getBeverageSectionWithItems(eventId), args: { eventId } },
  { name: "beverageItems.create", kind: "mutation", call: () => beverage.createBeverageItem({ eventId, name: "Lager", type: "Beer" }), args: { eventId, name: "Lager", type: "Beer" } },
  { name: "beverageItems.createAssignedToTimeblock", kind: "mutation", call: () => beverage.createBeverageItemAssignedToTimeblock({ eventId, timeblockId, name: "Lager", type: "Beer" }), args: { eventId, timeblockId, name: "Lager", type: "Beer" } },
  { name: "beverageItems.update", kind: "mutation", call: () => beverage.updateBeverageItem(id, { name: "New", quantity: null }), args: { id, updates: { name: "New", quantity: null } } },
  { name: "beverageItems.remove", kind: "mutation", call: () => beverage.deleteBeverageItem(id), args: { id } },
  { name: "beverageItems.setItemTimeblocks", kind: "mutation", call: () => beverage.setBeverageItemTimeblocks(id, [timeblockId]), args: { itemId: id, timeblockIds: [timeblockId] } },
  { name: "foodItems.getByEventId", kind: "source", call: () => food.getFoodSectionWithItems(eventId), args: { eventId } },
  { name: "foodItems.create", kind: "mutation", call: () => food.createFoodItem({ timeblockId, name: "Salad" }), args: { timeblockId, name: "Salad" } },
  { name: "foodItems.update", kind: "mutation", call: () => food.updateFoodItem(id, { name: "New" }), args: { id, updates: { name: "New" } } },
  { name: "foodItems.remove", kind: "mutation", call: () => food.deleteFoodItem(id), args: { id } },
  { name: "contacts.getById", kind: "source", call: () => contacts.getContactById(id), args: { id } },
  { name: "contacts.search", kind: "source", call: () => contacts.searchContacts({ limit: 20, cursor: "cursor" }), args: { limit: 20, cursor: "cursor" } },
  { name: "contacts.create", kind: "mutation", call: () => contacts.createContact(person), args: { input: person } },
  { name: "contacts.update", kind: "mutation", call: () => contacts.updateContact(id, person), args: { id, patch: person } },
  { name: "contacts.merge", kind: "mutation", call: () => contacts.mergeContacts(id, "target"), args: { sourceId: id, targetId: "target" } },
  { name: "eventContacts.getPanel", kind: "source", call: () => assignments.getEventContactsPanel(eventId), args: { eventId } },
  { name: "eventContacts.getPrimaryClients", kind: "source", call: () => assignments.getPrimaryClients([eventId]), args: { eventIds: [eventId] } },
  { name: "eventContacts.listEventsForContact", kind: "source", call: () => assignments.getContactEventHistory(id), args: { contactId: id } },
  { name: "eventContacts.assign", kind: "mutation", call: () => assignments.assignEventContact(eventId, { contactId: id }, "client", { isPrimary: true }), args: { eventId, target: { contactId: id }, role: "client", opts: { isPrimary: true } } },
  { name: "eventContacts.update", kind: "mutation", call: () => assignments.updateEventContact(id, { vendorCategoryId: null }), args: { id, patch: { vendorCategoryId: null } } },
  { name: "eventContacts.updateWithContact", kind: "mutation", call: () => assignments.updateEventContactWithContact(id, person, { notes: "New" }), args: { id, contactPatch: person, assignmentPatch: { notes: "New" } } },
  { name: "eventContacts.resolveRecipients", kind: "query", call: () => assignments.resolveEventRecipients(eventId, { eventContactIds: [id] }), args: { eventId, selection: { eventContactIds: [id] } } },
  { name: "contactRoles.listForContact", kind: "source", call: () => roles.getContactRoles(id), args: { contactId: id } },
  { name: "contactRoles.ensure", kind: "mutation", call: () => roles.ensureContactRole(id, "client"), args: { contactId: id, role: "client", vendorCategoryId: null } },
  { name: "users.list", kind: "source", call: () => users.getUsers(), args: {} },
  { name: "vendorCategories.getAll", kind: "source", call: () => categories.getVendorCategories({ includeArchived: true }), args: { includeArchived: true } },
  { name: "vendorCategories.create", kind: "mutation", call: () => categories.createVendorCategory({ key: "food", label: "Food", colorToken: "blue", sortOrder: 1 }), args: { input: { key: "food", label: "Food", colorToken: "blue", sortOrder: 1 } } },
  { name: "vendorCategories.update", kind: "mutation", call: () => categories.updateVendorCategory(id, { label: "New" }), args: { id, patch: { label: "New" } } },
  { name: "touchpoints.getByEventId", kind: "source", call: () => touchpoints.getTouchpointsByEventId(eventId), args: { eventId } },
  { name: "touchpoints.getIncompleteWithEvent", kind: "source", call: () => touchpoints.getIncompleteTouchpoints(), args: {} },
  { name: "touchpoints.getIncompleteByEventId", kind: "query", call: () => touchpoints.getIncompleteTouchpointsByEventId(eventId), args: { eventId } },
  { name: "touchpoints.create", kind: "mutation", call: () => touchpoints.createTouchpoint(eventId, { title: "Call" }), args: { eventId, values: { title: "Call" } } },
  { name: "touchpoints.update", kind: "mutation", call: () => touchpoints.updateTouchpoint(id, { title: "New", eventId }), args: { id, updates: { title: "New" } } },
  { name: "touchpoints.seedCommon", kind: "mutation", call: () => touchpoints.seedCommonTouchpoints(eventId), args: { eventId, timeZone: desktopTimeZone() } },
  { name: "touchpoints.remove", kind: "mutation", call: () => touchpoints.deleteTouchpoint(id), args: { id } },
  { name: "payments.getByEventId", kind: "source", call: () => payments.getPaymentsByEventId(eventId), args: { eventId } },
  { name: "payments.create", kind: "mutation", call: () => payments.createPayment(eventId), args: { eventId } },
  { name: "payments.update", kind: "mutation", call: () => payments.updatePayment(id, { amountCents: 100, eventId }), args: { id, updates: { amountCents: 100 } } },
  { name: "payments.remove", kind: "mutation", call: () => payments.deletePayment(id), args: { id } },
  { name: "menuOfChargeItems.getByEventId", kind: "source", call: () => charges.getMenuOfChargeItemsByEventId(eventId), args: { eventId } },
  { name: "menuOfChargeItems.create", kind: "mutation", call: () => charges.createMenuOfChargeItem(eventId), args: { eventId, category: null } },
  { name: "menuOfChargeItems.update", kind: "mutation", call: () => charges.updateMenuOfChargeItem(id, { name: "New", eventId }), args: { id, updates: { name: "New" } } },
  { name: "menuOfChargeItems.remove", kind: "mutation", call: () => charges.deleteMenuOfChargeItem(id), args: { id } },
  ...([
    ["contacts.archive", () => contacts.archiveContact(id), { id }],
    ["contacts.restore", () => contacts.restoreContact(id), { id }],
    ["contacts.remove", () => contacts.deleteContact(id), { id }],
    ["vendorCategories.archive", () => categories.archiveVendorCategory(id), { id }],
    ["vendorCategories.restore", () => categories.restoreVendorCategory(id), { id }],
    ["contactRoles.remove", () => roles.removeContactRole(id, "client"), { contactId: id, role: "client", vendorCategoryId: null }],
    ["eventContacts.setPrimary", () => assignments.setPrimaryEventContact(id), { id }],
    ["eventContacts.remove", () => assignments.removeEventContact(id), { id }],
    ["eventContacts.reorder", () => assignments.reorderEventContacts(eventId, "client", [id]), { eventId, role: "client", orderedIds: [id] }],
  ] satisfies [string, () => Promise<void>, object][]).map(([name, call, args]) => ({ name, call, args, kind: "mutation" as const, voidResult: true })),
]

describe("Convex data contracts", () => {
  beforeEach(() => vi.resetAllMocks())
  it.each(contracts)("$name calls the correct backend with allowlisted arguments", async ({ name, kind, call, args, voidResult }) => {
    const result = { id: "server-id" }
    const mock = vi.mocked(kind === "source" ? backend.fetchSource : kind === "query" ? backend.runQuery : backend.runMutation)
    mock.mockResolvedValue(result)
    expect(await call()).toEqual(voidResult ? undefined : result)
    expect(mock).toHaveBeenCalledTimes(1)
    const [reference, actualArgs] = mock.mock.calls[0]
    if (kind === "source") {
      const source = reference as unknown as { query: Parameters<typeof getFunctionName>[0]; args: object }
      expect(getFunctionName(source.query)).toBe(name.replace(".", ":"))
      expect(source.args).toEqual(args)
    } else {
      expect(getFunctionName(reference as Parameters<typeof getFunctionName>[0])).toBe(name.replace(".", ":"))
      expect(actualArgs).toEqual(args)
    }
  })
  it.each(contracts)("$name propagates backend failures", async ({ kind, call }) => {
    const error = new Error("Backend failed")
    vi.mocked(kind === "source" ? backend.fetchSource : kind === "query" ? backend.runQuery : backend.runMutation).mockRejectedValue(error)
    await expect(call()).rejects.toBe(error)
  })
})
