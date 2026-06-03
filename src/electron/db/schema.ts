import { relations } from "drizzle-orm";
import { index, sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";


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
  
  // Client contact (single client for now - will expand to separate table later)
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  
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
}, (table) => ({
  startDateTimeIdx: index("events_start_date_time_idx").on(table.startDateTime),
}));
export const eventsRelations = relations(events, ({ many }) => ({
  timeblocks: many(timeblocks),
  payments: many(payments),
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
}, (table) => ({
  eventIdUnique: uniqueIndex("tournament_details_event_id_unique").on(table.eventId),
}))
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
}, (table) => ({
  eventIdUnique: uniqueIndex("cart_details_event_id_unique").on(table.eventId),
}));
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
  sectionType: text("section_type", { enum: ["food", "beverage", "setup_instruction", "vendor", "note", "tournament_detail", "cart_detail"] }).notNull(),
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
  beverageItems: many(beverageItems),
  vendorItem: one(vendorItems),
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
  timeblockId: text("timeblock_id").references(() => timeblocks.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity"),
  type: text("type"),
  serviceStyle: text("service_style", {enum: ["Consumption Bar", "Cash Bar", "Open Bar", "Ticketed Bar"]}),
  includes: text("includes"),
  unitPriceCents: integer("unit_price_cents"),
});
export const beverageItemsRelations = relations(beverageItems, ({ one }) => ({
  timeblock: one(timeblocks, {
    fields: [beverageItems.timeblockId],
    references: [timeblocks.id],
  }),
}));

// Vendor items
export const vendorItems = sqliteTable("vendor_items", {
  id: text("id").primaryKey(),
  timeblockId: text("timeblock_id").references(() => timeblocks.id, { onDelete: "cascade" }).notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
}, (table) => ({
  timeblockIdUnique: uniqueIndex("vendor_items_timeblock_id_unique").on(table.timeblockId),
}));
export const vendorItemsRelations = relations(vendorItems, ({ one }) => ({
  timeblock: one(timeblocks, {
    fields: [vendorItems.timeblockId],
    references: [timeblocks.id],
  }),
}));
