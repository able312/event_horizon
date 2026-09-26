import { relations, sql } from "drizzle-orm";
import { check, index, sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";


/**
 * Events Table
 * 
 * Stores all event information including tournaments, weddings, and functions.
 */
export const events = sqliteTable("events", {
  // Primary key - UUID generated on insert
  id: text("id").primaryKey(),
  
  // Core event info
  title: text("title").notNull(),
  type: text("type", { enum: ["tournament", "wedding", "function"] }).notNull().default("function"), // tournament, wedding, function
  status: text("status", {enum: [
    "new_lead",
    "contacted",
    "ready_for_estimate",
    "estimate_sent",
    "estimate_confirmed",
    "agreement_sent",
    "agreement_and_deposit_received",
    "planning",
    "details_locked",
    "event_complete",
    "invoice_sent",
    "paid_in_full",
    "closed",
    "lost"
  ]}).notNull().default("new_lead"),
  
  // Scheduling
  startDateTime: text("start_date_time"), // ISO datetime string
  endDateTime: text("end_date_time"),     // ISO datetime string
  
  // Guest information
  minGuests: integer("min_guests"),
  maxGuests: integer("max_guests"),
  guestCountFinal: integer("guest_count_final"), // 0 = estimated, 1 = final
  
  // Integration IDs
  driveFolderId: text("drive_folder_id"),
  calendarId: text("calendar_id"),
  
  // Notes
  clientNotes: text("client_notes"),     // Visible to client
  internalNotes: text("internal_notes"), // Internal only
     
  // Tracking
  isInternal: integer("is_internal").default(0), // 0 = false, 1 = true
  createdAt: text("created_at").notNull(), // Unix timestamp
  updatedAt: text("updated_at"),           // Unix timestamp
}, (table) => [
  index("events_start_date_time_idx").on(table.startDateTime),
]);
export const eventsRelations = relations(events, ({ many }) => ({
  timeblocks: many(timeblocks),
  payments: many(payments),
  touchpoints: many(touchpoints),
  beverageItems: many(beverageItems),
  eventContacts: many(eventContacts),
}));


// ============================================================================
// Other Tables
// ============================================================================

export const tournamentDetails = sqliteTable("tournament_details", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  time: text("time"), // HH:mm format
  startFormat: text("start_format", { enum: ["Shotgun", "Tee Times"] }),
  playFormat: text("play_format", { enum: ["Scramble", "Best Ball", "Stroke Play", "Modified Stableford"] }),
  numberOfPlayers: integer("number_of_players"),
  paceOfPlay: text("pace_of_play"),
  leadCarts: text("lead_carts"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => [
  uniqueIndex("tournament_details_event_id_unique").on(table.eventId),
])
export const tournamentDetailsRelations = relations(tournamentDetails, ({ one }) => ({
  event: one(events, {
    fields: [tournamentDetails.eventId],
    references: [events.id],
  }),
}));

export const cartDetails = sqliteTable('cart_details', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  
  time: text('time'), // "08:30" format (HH:MM)

  // "template-12-hole-shotgun" or "custom"
  layout: text('layout', { enum: ['template-12-hole-shotgun', 'custom'] })
    .notNull()
    .default('template-12-hole-shotgun'),
  
  // Custom grid stored as JSON string
  // Structure: [[7,5,9,10,3,1], [7,5,9,10,3,1], ..., ["Lead","Lead","Lead",null,null,null]]
  // null when layout is template-based
  customGrid: text('custom_grid', { mode: 'json' }).$type<(number | string | null)[][]>(),
  
  whatGoesOnCarts: text('what_goes_on_carts').default(''),
  assignedTo: text('assigned_to').default(''),
  rentingCarts: integer('renting_carts', { mode: 'boolean' }).notNull().default(false),
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at')
}, (table) => [
  uniqueIndex("cart_details_event_id_unique").on(table.eventId),
]);
export const cartDetailsRelations = relations(cartDetails, ({ one }) => ({
  event: one(events, {
    fields: [cartDetails.eventId],
    references: [events.id],
  }),
}));

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(), // ISO date string
  recieptNumber: text("reciept_number"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
export const paymentsRelations = relations(payments, ({ one }) => ({
  event: one(events, {
    fields: [payments.eventId],
    references: [events.id],
  }),
}));

export const touchpoints = sqliteTable("touchpoints", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull().default(""),
  dueDate: text("due_date"), // ISO date string, nullable for title-only saves
  completedAt: text("completed_at"), // ISO datetime when marked complete; null = open
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("touchpoints_event_id_idx").on(table.eventId),
  index("touchpoints_due_date_idx").on(table.dueDate),
]);
export const touchpointsRelations = relations(touchpoints, ({ one }) => ({
  event: one(events, {
    fields: [touchpoints.eventId],
    references: [events.id],
  }),
}));

export const menuOfChargeItems = sqliteTable("menu_of_charge_items", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity"),
  category: text("charge_type", {enum: ["Goods", "Service", "Golf", "Food & Beverage", "Venue"]}),
  includes: text("includes"),
  unitPriceCents: integer("unit_price_cents"),
  createdAt: text("created_at").notNull(),
});
export const menuOfChargeItemsRelations = relations(menuOfChargeItems, ({ one }) => ({
  event: one(events, {
    fields: [menuOfChargeItems.eventId],
    references: [events.id],
  }),
}));

// ============================================================================
// Timeblocks - Universal timeline/detail bridge, "Spine"
// ============================================================================

export const timeblocks = sqliteTable("timeblocks", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  time: text("time"), // HH:mm format - if set, appears on timeline
  details: text("details"),
  sectionType: text("section_type", { enum: ["food", "beverage", "setup_instruction", "note", "tournament_detail", "cart_detail"] }).notNull(),
  assignedTo: text("assigned_to"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at")
});

export const timeblocksRelations = relations(timeblocks, ({ many, one }) => ({
  event: one(events, {
    fields: [timeblocks.eventId],
    references: [events.id],
  }),
  foodItems: many(foodItems),
  beverageItemTimeblocks: many(beverageItemTimeblocks),
}));

// ============================================================================
// Satelite Tables
// ============================================================================

// Food items
export const foodItems = sqliteTable("food_items", {
  id: text("id").primaryKey(),
  timeblockId: text("timeblock_id").references(() => timeblocks.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity"),
  serviceStyle: text("service_style", {enum: ["Buffet", "Family-Style", "Plated", "Passed"]}),
  includes: text("includes"),
  unitPriceCents: integer("unit_price_cents"),
});
export const foodItemsRelations = relations(foodItems, ({ one }) => ({
  timeblock: one(timeblocks, {
    fields: [foodItems.timeblockId],
    references: [timeblocks.id],
  }),
}));


// Beverage items
export const beverageItems = sqliteTable("beverage_items", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity"),
  type: text("type", { enum: ["Special Orders", "Beer", "Wine", "Coolers", "Rails", "Non-Alcoholic"] }).notNull(),
  serviceStyle: text("service_style", {enum: ["Consumption Bar", "Cash Bar", "Open Bar", "Ticketed Bar"]}),
  includes: text("includes"),
  unitPriceCents: integer("unit_price_cents"),
});
export const beverageItemsRelations = relations(beverageItems, ({ one, many }) => ({
  event: one(events, {
    fields: [beverageItems.eventId],
    references: [events.id],
  }),
  beverageItemTimeblocks: many(beverageItemTimeblocks),
}));

export const beverageItemTimeblocks = sqliteTable("beverage_item_timeblocks", {
  beverageItemId: text("beverage_item_id").references(() => beverageItems.id, { onDelete: "cascade" }).notNull(),
  timeblockId: text("timeblock_id").references(() => timeblocks.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  uniqueIndex("beverage_item_timeblocks_unique").on(table.beverageItemId, table.timeblockId),
]);
export const beverageItemTimeblocksRelations = relations(beverageItemTimeblocks, ({ one }) => ({
  beverageItem: one(beverageItems, {
    fields: [beverageItemTimeblocks.beverageItemId],
    references: [beverageItems.id],
  }),
  timeblock: one(timeblocks, {
    fields: [beverageItemTimeblocks.timeblockId],
    references: [timeblocks.id],
  }),
}));

// ============================================================================
// Contacts - one row per real person or company, described by roles
// ============================================================================

export const CONTACT_KINDS = ["individual", "organization"] as const
export const CONTACT_ROLE_TYPES = ["client", "coordinator", "vendor"] as const

// Identity: who is this person or company, and how do we reach them?
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: CONTACT_KINDS }).notNull().default("individual"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  organizationName: text("organization_name"),
  displayName: text("display_name").notNull(), // stored so people and companies sort/search the same way
  email: text("email"), // original casing, for display
  emailNormalized: text("email_normalized").generatedAlwaysAs(
    sql`nullif(lower(trim("email")), '')`,
    { mode: "stored" },
  ), // used for matching and uniqueness
  phone: text("phone"),
  notes: text("notes"),
  archivedAt: text("archived_at"), // ISO datetime; archived contacts can't be newly assigned
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  check("contacts_kind_check", sql`${table.kind} IN ('individual', 'organization')`),
  // Email is optional but unique among active contacts
  uniqueIndex("contacts_email_unique")
    .on(table.emailNormalized)
    .where(sql`${table.emailNormalized} IS NOT NULL AND ${table.archivedAt} IS NULL`),
  index("contacts_display_name_idx").on(table.displayName),
]);
export const contactsRelations = relations(contacts, ({ many }) => ({
  roles: many(contactRoles),
  eventContacts: many(eventContacts),
}));

// Editable lookup of vendor categories (catering, rentals, music, ...)
export const vendorCategories = sqliteTable("vendor_categories", {
  id: text("id").primaryKey(),
  key: text("key").notNull(), // 'catering' - immutable once used
  label: text("label").notNull(), // 'Catering'
  colorToken: text("color_token").notNull(), // 'teal', 'amber', ...
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: text("archived_at"), // hidden from pickers; existing rows keep it
}, (table) => [
  uniqueIndex("vendor_categories_key_unique").on(table.key),
]);

// Standing role: what does this contact generally do for us?
export const contactRoles = sqliteTable("contact_roles", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  role: text("role", { enum: CONTACT_ROLE_TYPES }).notNull(),
  vendorCategoryId: text("vendor_category_id").references(() => vendorCategories.id),
  createdAt: text("created_at").notNull(),
}, (table) => [
  check("contact_roles_role_check", sql`${table.role} IN ('client', 'coordinator', 'vendor')`),
  // A category is required for vendors and forbidden for other roles
  check(
    "contact_roles_vendor_category_check",
    sql`(${table.role} = 'vendor') = (${table.vendorCategoryId} IS NOT NULL)`,
  ),
  uniqueIndex("contact_roles_unique").on(
    table.contactId,
    table.role,
    sql`coalesce(${table.vendorCategoryId}, '')`,
  ),
  index("contact_roles_role_category_idx").on(table.role, table.vendorCategoryId),
]);
export const contactRolesRelations = relations(contactRoles, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactRoles.contactId],
    references: [contacts.id],
  }),
  vendorCategory: one(vendorCategories, {
    fields: [contactRoles.vendorCategoryId],
    references: [vendorCategories.id],
  }),
}));

// Assignment: what is this contact doing on this specific event?
export const eventContacts = sqliteTable("event_contacts", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  // No cascade: a contact with assignment history can only be archived, not deleted
  contactId: text("contact_id").notNull().references(() => contacts.id),
  role: text("role", { enum: CONTACT_ROLE_TYPES }).notNull(),
  vendorCategoryId: text("vendor_category_id").references(() => vendorCategories.id),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  roleLabel: text("role_label"), // 'Lead coordinator', 'Bride's father'
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  removedAt: text("removed_at"), // soft remove
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  check("event_contacts_role_check", sql`${table.role} IN ('client', 'coordinator', 'vendor')`),
  check(
    "event_contacts_vendor_category_check",
    sql`(${table.role} = 'vendor') = (${table.vendorCategoryId} IS NOT NULL)`,
  ),
  uniqueIndex("event_contacts_unique_active")
    .on(table.eventId, table.contactId, table.role, sql`coalesce(${table.vendorCategoryId}, '')`)
    .where(sql`${table.removedAt} IS NULL`),
  index("event_contacts_by_event").on(table.eventId).where(sql`${table.removedAt} IS NULL`),
  index("event_contacts_by_contact").on(table.contactId),
]);
export const eventContactsRelations = relations(eventContacts, ({ one }) => ({
  event: one(events, {
    fields: [eventContacts.eventId],
    references: [events.id],
  }),
  contact: one(contacts, {
    fields: [eventContacts.contactId],
    references: [contacts.id],
  }),
  vendorCategory: one(vendorCategories, {
    fields: [eventContacts.vendorCategoryId],
    references: [vendorCategories.id],
  }),
}));
