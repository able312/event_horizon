import { 
    events, 
    timeblocks, 
    foodItems, 
    beverageItems, 
    vendorItems, 
    setupInstructions, 
    payments, 
    notes, 
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
// Timeblocks
// ============================================================================

export type Timeblock = InferSelectModel<typeof timeblocks>
export type NewTimeblock = InferInsertModel<typeof timeblocks>
export type UpdateTimeblock = Partial<Omit<Timeblock, "id" | "createdAt">>

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

// ============================================================================
// Vendor Items
// ============================================================================

export type VendorItem = InferSelectModel<typeof vendorItems>
export type UpdateVendorItem = Partial<Omit<VendorItem, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Setup Instructions
// ============================================================================

export type SetupInstruction = InferSelectModel<typeof setupInstructions>
export type UpdateSetupInstruction = Partial<Omit<SetupInstruction, "id" | "createdAt" | "updatedAt">>

// ============================================================================
// Setup Instructions
// ============================================================================

export type Note = InferSelectModel<typeof notes>
export type UpdateNote = Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>