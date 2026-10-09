import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import {
  beverageServiceStyle,
  beverageType,
  cartGrid,
  cartLayout,
  chargeCategory,
  contactKind,
  contactRoleType,
  eventStatus,
  eventType,
  foodServiceStyle,
  nullable,
  playFormat,
  startFormat,
  timeblockSectionType,
} from "./lib/validators"

// Field names and shapes match the shared record types in src/definitions, so a
// document maps to a record by renaming _id to id (see lib/records.ts).
// Timestamps stay as strings to match the records the app already uses.

export default defineSchema({
  events: defineTable({
    title: v.string(),
    type: eventType,
    status: eventStatus,
    startDateTime: nullable(v.string()),
    endDateTime: nullable(v.string()),
    minGuests: nullable(v.number()),
    maxGuests: nullable(v.number()),
    guestCountFinal: nullable(v.number()),
    driveFolderId: nullable(v.string()),
    calendarId: nullable(v.string()),
    clientNotes: nullable(v.string()),
    internalNotes: nullable(v.string()),
    isInternal: nullable(v.number()),
    createdAt: v.string(),
    updatedAt: nullable(v.string()),
  })
    // Month ranges, and unscheduled events (null start) in creation order
    .index("by_start", ["startDateTime", "createdAt"])
    .index("by_calendarId", ["calendarId"]),

  tournamentDetails: defineTable({
    eventId: v.id("events"),
    time: nullable(v.string()),
    startFormat: nullable(startFormat),
    playFormat: nullable(playFormat),
    numberOfPlayers: nullable(v.number()),
    paceOfPlay: nullable(v.string()),
    leadCarts: nullable(v.string()),
    notes: nullable(v.string()),
    createdAt: v.string(),
    updatedAt: nullable(v.string()),
  }).index("by_event", ["eventId"]),

  cartDetails: defineTable({
    eventId: v.id("events"),
    time: nullable(v.string()),
    layout: cartLayout,
    customGrid: nullable(cartGrid),
    whatGoesOnCarts: nullable(v.string()),
    assignedTo: nullable(v.string()),
    rentingCarts: v.boolean(),
    createdAt: v.string(),
    updatedAt: nullable(v.string()),
  }).index("by_event", ["eventId"]),

  payments: defineTable({
    eventId: v.id("events"),
    amountCents: v.number(),
    date: v.string(),
    recieptNumber: nullable(v.string()),
    notes: nullable(v.string()),
    createdAt: v.string(),
  }).index("by_event", ["eventId"]),

  touchpoints: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    dueDate: nullable(v.string()),
    completedAt: nullable(v.string()),
    createdAt: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_completedAt", ["completedAt"]),

  menuOfChargeItems: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    quantity: nullable(v.number()),
    category: nullable(chargeCategory),
    includes: nullable(v.string()),
    unitPriceCents: nullable(v.number()),
    createdAt: v.string(),
  }).index("by_event", ["eventId"]),

  timeblocks: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    time: nullable(v.string()),
    details: nullable(v.string()),
    sectionType: timeblockSectionType,
    assignedTo: nullable(v.string()),
    createdAt: v.string(),
    updatedAt: nullable(v.string()),
  }).index("by_event_section", ["eventId", "sectionType"]),

  foodItems: defineTable({
    timeblockId: v.id("timeblocks"),
    name: v.string(),
    quantity: nullable(v.number()),
    serviceStyle: nullable(foodServiceStyle),
    includes: nullable(v.string()),
    unitPriceCents: nullable(v.number()),
  }).index("by_timeblock", ["timeblockId"]),

  beverageItems: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    quantity: nullable(v.number()),
    type: beverageType,
    serviceStyle: nullable(beverageServiceStyle),
    includes: nullable(v.string()),
    unitPriceCents: nullable(v.number()),
  }).index("by_event", ["eventId"]),

  beverageItemTimeblocks: defineTable({
    beverageItemId: v.id("beverageItems"),
    timeblockId: v.id("timeblocks"),
  })
    .index("by_item", ["beverageItemId"])
    .index("by_timeblock", ["timeblockId"]),

  contacts: defineTable({
    kind: contactKind,
    firstName: nullable(v.string()),
    lastName: nullable(v.string()),
    organizationName: nullable(v.string()),
    displayName: v.string(),
    email: nullable(v.string()),
    // Lowercased, trimmed email; unique among active contacts (enforced in contacts.ts)
    emailNormalized: nullable(v.string()),
    phone: nullable(v.string()),
    notes: nullable(v.string()),
    archivedAt: nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_emailNormalized", ["emailNormalized"]),

  vendorCategories: defineTable({
    key: v.string(),
    label: v.string(),
    colorToken: v.string(),
    sortOrder: v.number(),
    archivedAt: nullable(v.string()),
  }).index("by_key", ["key"]),

  contactRoles: defineTable({
    contactId: v.id("contacts"),
    role: contactRoleType,
    vendorCategoryId: nullable(v.id("vendorCategories")),
    createdAt: v.string(),
  })
    .index("by_contact", ["contactId"])
    .index("by_vendorCategory", ["vendorCategoryId"]),

  eventContacts: defineTable({
    eventId: v.id("events"),
    contactId: v.id("contacts"),
    role: contactRoleType,
    vendorCategoryId: nullable(v.id("vendorCategories")),
    isPrimary: v.boolean(),
    roleLabel: nullable(v.string()),
    notes: nullable(v.string()),
    sortOrder: v.number(),
    removedAt: nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_contact", ["contactId"])
    .index("by_vendorCategory", ["vendorCategoryId"]),

  // Company accounts, upserted by users.store after each sign-in. Keyed by the
  // WorkOS user ID (the JWT subject) so email changes don't create duplicates.
  users: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    name: nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workosUserId", ["workosUserId"]),
})
