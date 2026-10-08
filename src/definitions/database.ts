import type {
  BEVERAGE_SERVICE_STYLES,
  BEVERAGE_TYPES,
  CART_LAYOUTS,
  CHARGE_CATEGORIES,
  EVENT_STATUSES,
  EVENT_TYPES,
  FOOD_SERVICE_STYLES,
  PLAY_FORMATS,
  START_FORMATS,
  TIMEBLOCK_SECTION_TYPES,
} from "./enums.js"

// Record shapes shared by the UI and the data layer. They are written out by hand
// so they don't depend on a storage backend; src/electron/db/schemaConformance.ts
// checks that the SQLite schema still matches them.

// ============================================================================
// Events
// ============================================================================

//Event Enums
export type EventType = (typeof EVENT_TYPES)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]

export type Event = {
  id: string
  title: string
  type: EventType
  status: EventStatus
  /** ISO datetime */
  startDateTime: string | null
  /** ISO datetime */
  endDateTime: string | null
  minGuests: number | null
  maxGuests: number | null
  /** 0 = estimated, 1 = final */
  guestCountFinal: number | null
  driveFolderId: string | null
  calendarId: string | null
  /** Visible to client */
  clientNotes: string | null
  /** Internal only */
  internalNotes: string | null
  /** 0 = false, 1 = true */
  isInternal: number | null
  /** Unix timestamp (ms) as a string */
  createdAt: string
  /** Unix timestamp (ms) as a string */
  updatedAt: string | null
}
export type NewEvent = {
  id: string
  title: string
  createdAt: string
  type?: EventType
  status?: EventStatus
  startDateTime?: string | null
  endDateTime?: string | null
  minGuests?: number | null
  maxGuests?: number | null
  guestCountFinal?: number | null
  driveFolderId?: string | null
  calendarId?: string | null
  clientNotes?: string | null
  internalNotes?: string | null
  isInternal?: number | null
  updatedAt?: string | null
}
export type UpdateEvent = Partial<Omit<Event, "id" | "createdAt">>

// ============================================================================
// Tournament Details
// ============================================================================

// Tournament Detail Enums
export type StartFormat = (typeof START_FORMATS)[number]
export type PlayFormat = (typeof PLAY_FORMATS)[number]

export type TournamentDetails = {
  id: string
  eventId: string
  /** HH:mm */
  time: string | null
  startFormat: StartFormat | null
  playFormat: PlayFormat | null
  numberOfPlayers: number | null
  paceOfPlay: string | null
  leadCarts: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}
export type UpdateTournamentDetails = Partial<Omit<TournamentDetails, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Cart Details
// ============================================================================

export type CartLayout = (typeof CART_LAYOUTS)[number]
/** Rows of cart numbers or labels, e.g. [[7,5,9,10,3,1], ..., ["Lead","Lead",null]] */
export type CartGrid = (number | string | null)[][]

export type CartDetails = {
  id: string
  eventId: string
  /** HH:mm */
  time: string | null
  layout: CartLayout
  /** null when layout is template-based */
  customGrid: CartGrid | null
  whatGoesOnCarts: string | null
  assignedTo: string | null
  rentingCarts: boolean
  createdAt: string
  updatedAt: string | null
}
export type UpdateCartDetails = Partial<Omit<CartDetails, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Menu of Charge Items
// ============================================================================

// Menu of Charge Enums
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number]

export type MenuOfChargeItem = {
  id: string
  eventId: string
  name: string
  quantity: number | null
  category: ChargeCategory | null
  includes: string | null
  unitPriceCents: number | null
  createdAt: string
}
export type NewMenuOfChargeItem = {
  id: string
  eventId: string
  name: string
  createdAt: string
  quantity?: number | null
  category?: ChargeCategory | null
  includes?: string | null
  unitPriceCents?: number | null
}
export type UpdateMenuOfChargeItem = Partial<Omit<MenuOfChargeItem, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Payments
// ============================================================================

export type Payment = {
  id: string
  eventId: string
  amountCents: number
  /** ISO date */
  date: string
  recieptNumber: string | null
  notes: string | null
  createdAt: string
}
export type NewPayment = {
  id: string
  eventId: string
  amountCents: number
  date: string
  createdAt: string
  recieptNumber?: string | null
  notes?: string | null
}
export type UpdatePayment = Partial<Omit<Payment, "id" | "createdAt">>

// ============================================================================
// Touchpoints
// ============================================================================

export type Touchpoint = {
  id: string
  eventId: string
  title: string
  /** ISO date; null for title-only saves */
  dueDate: string | null
  /** ISO datetime when marked complete; null = open */
  completedAt: string | null
  createdAt: string
}
export type NewTouchpoint = {
  id: string
  eventId: string
  createdAt: string
  title?: string
  dueDate?: string | null
  completedAt?: string | null
}
export type UpdateTouchpoint = Partial<Omit<Touchpoint, "id" | "createdAt">>

export type IncompleteTouchpointWithEvent = Touchpoint & {
  eventTitle: string
}

// ============================================================================
// Timeblocks
// ============================================================================

export type TimeblockSectionType = (typeof TIMEBLOCK_SECTION_TYPES)[number]

export type Timeblock = {
  id: string
  eventId: string
  title: string
  /** HH:mm; when set, the block appears on the timeline */
  time: string | null
  details: string | null
  sectionType: TimeblockSectionType
  assignedTo: string | null
  createdAt: string
  updatedAt: string | null
}
export type NewTimeblock = {
  id: string
  eventId: string
  title: string
  sectionType: TimeblockSectionType
  createdAt: string
  time?: string | null
  details?: string | null
  assignedTo?: string | null
  updatedAt?: string | null
}
/** Allowlisted fields for ordinary timeblock patches from the renderer. */
export type UpdateTimeblock = {
  title?: string
  time?: string | null
  details?: string | null
  assignedTo?: string | null
}

// ============================================================================
// Food Items
// ============================================================================

export type FoodServiceStyle = (typeof FOOD_SERVICE_STYLES)[number]

export type FoodItem = {
  id: string
  timeblockId: string
  name: string
  quantity: number | null
  serviceStyle: FoodServiceStyle | null
  includes: string | null
  unitPriceCents: number | null
}
export type NewFoodItem = {
  id: string
  timeblockId: string
  name: string
  quantity?: number | null
  serviceStyle?: FoodServiceStyle | null
  includes?: string | null
  unitPriceCents?: number | null
}
export type UpdateFoodItem = Partial<Omit<FoodItem, "id">>

// ============================================================================
// Beverage Items
// ============================================================================

export type BeverageItemType = (typeof BEVERAGE_TYPES)[number]
export type BeverageServiceStyle = (typeof BEVERAGE_SERVICE_STYLES)[number]

export type BeverageItem = {
  id: string
  eventId: string
  name: string
  quantity: number | null
  type: BeverageItemType
  serviceStyle: BeverageServiceStyle | null
  includes: string | null
  unitPriceCents: number | null
}
export type NewBeverageItem = {
  id: string
  eventId: string
  name: string
  type: BeverageItemType
  quantity?: number | null
  serviceStyle?: BeverageServiceStyle | null
  includes?: string | null
  unitPriceCents?: number | null
}
export type UpdateBeverageItem = Partial<Omit<BeverageItem, "id">>

export type BeverageItemTimeblock = {
  beverageItemId: string
  timeblockId: string
}
export type NewBeverageItemTimeblock = BeverageItemTimeblock
