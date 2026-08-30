import { 
    events, 
    timeblocks, 
    foodItems, 
    beverageItems,
    beverageItemTimeblocks,
    vendorItems, 
    payments,
    touchpoints,
    tournamentDetails,
    menuOfChargeItems,
    cartDetails 
} from "../electron/db/schema.js"
import type { InferInsertModel, InferSelectModel } from "drizzle-orm"

// ============================================================================
// Events
// ============================================================================

export type Event = InferSelectModel<typeof events>
export type NewEvent = InferInsertModel<typeof events>
export type UpdateEvent = Partial<Omit<Event, "id" | "createdAt">>

//Event Enums
export type EventType = (typeof events.type.enumValues)[number]
export type EventStatus = (typeof events.status.enumValues)[number]

// ============================================================================
// Tournament Details
// ============================================================================

export type TournamentDetails = InferSelectModel<typeof tournamentDetails>
export type UpdateTournamentDetails = Partial<Omit<TournamentDetails, "id" | "createdAt" | "updatedAt">>
// Tournament Detail Enums
export type StartFormat = (typeof tournamentDetails.startFormat.enumValues)[number]
export type PlayFormat = (typeof tournamentDetails.playFormat.enumValues)[number]

// ============================================================================
// Cart Details
// ============================================================================

export type CartDetails = InferSelectModel<typeof cartDetails>
export type UpdateCartDetails = Partial<Omit<CartDetails, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Menu of Charge Items
// ============================================================================

export type MenuOfChargeItem = InferSelectModel<typeof menuOfChargeItems>
export type NewMenuOfChargeItem = InferInsertModel<typeof menuOfChargeItems>
export type UpdateMenuOfChargeItem = Partial<Omit<MenuOfChargeItem, "id" | "createdAt" | "updatedAt">>
// Menu of Charge Enums
export type ChargeCategory = (typeof menuOfChargeItems.category.enumValues)[number]

// ============================================================================
// Payments
// ============================================================================

export type Payment = InferSelectModel<typeof payments>
export type NewPayment = InferInsertModel<typeof payments>
export type UpdatePayment = Partial<Omit<Payment, "id" | "createdAt">>

// ============================================================================
// Touchpoints
// ============================================================================

export type Touchpoint = InferSelectModel<typeof touchpoints>
export type NewTouchpoint = InferInsertModel<typeof touchpoints>
export type UpdateTouchpoint = Partial<Omit<Touchpoint, "id" | "createdAt">>

export type IncompleteTouchpointWithEvent = Touchpoint & {
  eventTitle: string
}

// ============================================================================
// Timeblocks
// ============================================================================

export type Timeblock = InferSelectModel<typeof timeblocks>
export type NewTimeblock = InferInsertModel<typeof timeblocks>
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

export type FoodItem = InferSelectModel<typeof foodItems>
export type NewFoodItem = InferInsertModel<typeof foodItems>
export type UpdateFoodItem = Partial<Omit<FoodItem, "id">>

// ============================================================================
// Beverage Items
// ============================================================================

export type BeverageItem = InferSelectModel<typeof beverageItems>
export type NewBeverageItem = InferInsertModel<typeof beverageItems>
export type UpdateBeverageItem = Partial<Omit<BeverageItem, "id">>
export type BeverageItemType = (typeof beverageItems.type.enumValues)[number]

export type BeverageItemTimeblock = InferSelectModel<typeof beverageItemTimeblocks>
export type NewBeverageItemTimeblock = InferInsertModel<typeof beverageItemTimeblocks>

// ============================================================================
// Vendor Items
// ============================================================================

export type VendorItem = InferSelectModel<typeof vendorItems>
export type UpdateVendorItem = Partial<Omit<VendorItem, "id" | "createdAt" | "updatedAt">>
