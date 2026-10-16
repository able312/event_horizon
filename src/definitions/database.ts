import type {
  BEVERAGE_SERVICE_STYLES,
  BEVERAGE_TYPES,
  CART_LAYOUTS,
  CHARGE_CATEGORIES,
  EVENT_REQUEST_STATUSES,
  EVENT_STATUSES,
  EVENT_TYPES,
  FOOD_SERVICE_STYLES,
  PLAY_FORMATS,
  START_FORMATS,
  TIMEBLOCK_SECTION_TYPES,
} from "./enums.js"

// Record shapes shared by the UI and the data layer. They are written out by hand
// so they don't depend on a storage backend; the typed functions in src/lib/data
// fail the typecheck if a Convex function's result stops matching them.

// ============================================================================
// Audit
// ============================================================================

/**
 * Who created and last edited a record (user IDs). The server sets them on every
 * write; they're absent when unknown (records saved before auditing, or imported).
 */
export type AuditFields = {
  createdBy?: string
  updatedBy?: string
}

/** A company account, for showing who created or last edited a record. */
export type UserSummary = {
  id: string
  name: string | null
  email: string
}

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
} & AuditFields
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
export type UpdateEvent = Partial<Omit<Event, "id" | "createdAt" | keyof AuditFields>>

// ============================================================================
// Event Requests (website form)
// ============================================================================

export type EventRequestStatus = (typeof EVENT_REQUEST_STATUSES)[number]

export type EventRequest = {
  id: string
  /** The Google Forms response ID */
  responseId: string
  /** ISO datetime the client submitted the form */
  submittedAt: string
  /** ISO datetime the app received it */
  receivedAt: string
  /** The client's own name for the event, e.g. "Sarah's 40th" */
  eventName: string | null
  firstName: string
  lastName: string
  organizationName: string | null
  email: string
  phone: string
  eventType: EventType
  /** yyyy-MM-dd, the client's calendar day */
  preferredDate: string | null
  /** yyyy-MM-dd */
  alternateDate: string | null
  /** HH:mm */
  startTime: string | null
  guestCount: number
  details: string | null
  referralSource: string | null
  /** Answers to form questions the app doesn't map to a field */
  extraAnswers: { question: string; answer: string }[]
  status: EventRequestStatus
  eventId: string | null
  reviewedBy: string | null
  reviewedAt: string | null
}

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
