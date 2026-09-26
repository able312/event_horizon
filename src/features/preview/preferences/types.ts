import type { PreviewTypeId } from "~/features/preview/lib/previewTypes"

export type BeoSectionId =
  | "contact"
  | "internalNotes"
  | "tournament"
  | "cart"
  | "food"
  | "beverage"
  | "setup"
  | "notes"

export type BeoTimeblockSectionId = "food" | "beverage" | "setup" | "notes"

export type BeoPreferences = {
  showContactInfo: boolean
  showInternalNotes: boolean
  showPricing: boolean
  sections: Record<Exclude<BeoSectionId, "contact" | "internalNotes">, boolean>
  selectedTimeblockIds: Record<BeoTimeblockSectionId, string[]>
}

export type FoodBeoPreferences = {
  showContactInfo: boolean
  showInternalNotes: boolean
  showPricing: boolean
  selectedFoodTimeblockIds: string[]
}

export type TimelinePreferences = {
  showInternalNotes: boolean
  includeSystemRows: boolean
}

export type FinancialPreferences = {
  showBeverageAppendix: boolean
  showBeverageNotes: boolean
  showChargeBreakdown: boolean
  showPaymentStatus: boolean
}

export type PreviewPreferencesState = {
  beo: BeoPreferences
  "beo-food": FoodBeoPreferences
  timeline: TimelinePreferences
  "financial-report": FinancialPreferences
  /** Tracks which data-derived defaults have been applied once. */
  defaultsApplied: {
    beoTimeblocks: boolean
    foodBeoTimeblocks: boolean
    financialPayments: boolean
  }
}

export type PreviewPreferencesAction =
  | { type: "beo/setShowContactInfo"; value: boolean }
  | { type: "beo/setShowInternalNotes"; value: boolean }
  | { type: "beo/setShowPricing"; value: boolean }
  | { type: "beo/setSectionVisible"; section: keyof BeoPreferences["sections"]; value: boolean }
  | { type: "beo/setTimeblockSelected"; section: BeoTimeblockSectionId; id: string; value: boolean }
  | { type: "beo/selectAllTimeblocks"; section: BeoTimeblockSectionId; ids: string[] }
  | { type: "beo/clearAllTimeblocks"; section: BeoTimeblockSectionId }
  | { type: "beo/applyDefaultTimeblocks"; selections: Record<BeoTimeblockSectionId, string[]> }
  | { type: "beo-food/setShowContactInfo"; value: boolean }
  | { type: "beo-food/setShowInternalNotes"; value: boolean }
  | { type: "beo-food/setShowPricing"; value: boolean }
  | { type: "beo-food/setTimeblockSelected"; id: string; value: boolean }
  | { type: "beo-food/selectAllTimeblocks"; ids: string[] }
  | { type: "beo-food/clearAllTimeblocks" }
  | { type: "beo-food/applyDefaultTimeblocks"; ids: string[] }
  | { type: "timeline/setShowInternalNotes"; value: boolean }
  | { type: "timeline/setIncludeSystemRows"; value: boolean }
  | { type: "financial/setShowBeverageAppendix"; value: boolean }
  | { type: "financial/setShowBeverageNotes"; value: boolean }
  | { type: "financial/setShowChargeBreakdown"; value: boolean }
  | { type: "financial/setShowPaymentStatus"; value: boolean }
  | { type: "financial/applyPaymentDefault"; hasPayments: boolean }

export function createInitialBeoPreferences(): BeoPreferences {
  return {
    showContactInfo: true,
    showInternalNotes: true,
    showPricing: false,
    sections: {
      tournament: true,
      cart: true,
      food: true,
      beverage: true,
      setup: true,
      notes: true,
    },
    selectedTimeblockIds: {
      food: [],
      beverage: [],
      setup: [],
      notes: [],
    },
  }
}

export function createInitialFoodBeoPreferences(): FoodBeoPreferences {
  return {
    showContactInfo: false,
    showInternalNotes: true,
    showPricing: false,
    selectedFoodTimeblockIds: [],
  }
}

export function createInitialTimelinePreferences(): TimelinePreferences {
  return {
    showInternalNotes: true,
    includeSystemRows: true,
  }
}

export function createInitialFinancialPreferences(): FinancialPreferences {
  return {
    showBeverageAppendix: false,
    showBeverageNotes: false,
    showChargeBreakdown: true,
    showPaymentStatus: false,
  }
}

export function createInitialPreviewPreferences(): PreviewPreferencesState {
  return {
    beo: createInitialBeoPreferences(),
    "beo-food": createInitialFoodBeoPreferences(),
    timeline: createInitialTimelinePreferences(),
    "financial-report": createInitialFinancialPreferences(),
    defaultsApplied: {
      beoTimeblocks: false,
      foodBeoTimeblocks: false,
      financialPayments: false,
    },
  }
}

export type PreferencesForType<T extends PreviewTypeId> = PreviewPreferencesState[T]
