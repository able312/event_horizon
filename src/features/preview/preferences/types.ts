import {
  DEFAULT_FINANCIAL_DOCUMENT_KIND,
  type FinancialDocumentKind,
} from "~/features/preview/lib/financialDocumentKinds"
import {
  DEFAULT_FOOD_PACKAGE_ESTIMATE_MODE,
  type FoodPackageEstimateMode,
} from "~/features/preview/lib/foodPackages"

export type BeoSectionId =
  | "contact"
  | "internalNotes"
  | "tournament"
  | "cart"
  | "food"
  | "beverage"
  | "setup"
  | "notes"

export const BEO_TIMEBLOCK_SECTION_IDS = ["food", "beverage", "setup", "notes"] as const

export type BeoTimeblockSectionId = (typeof BEO_TIMEBLOCK_SECTION_IDS)[number]

export type BeoPreferences = {
  showContactInfo: boolean
  /** The event's own internal notes, in the header. */
  showInternalNotes: boolean
  /** Food items' kitchen-only internal notes, under each item. */
  showKitchenNotes: boolean
  showPricing: boolean
  sections: Record<Exclude<BeoSectionId, "contact" | "internalNotes">, boolean>
  selectedTimeblockIds: Record<BeoTimeblockSectionId, string[]>
}

export type FoodBeoPreferences = {
  showContactInfo: boolean
  /** The event's own internal notes, in the header. */
  showInternalNotes: boolean
  /** Food items' kitchen-only internal notes, under each item. */
  showKitchenNotes: boolean
  showPricing: boolean
  selectedFoodTimeblockIds: string[]
}

export type TimelinePreferences = {
  /** The event's own internal notes, in the header. */
  showInternalNotes: boolean
  /** Food items' kitchen-only internal notes, under each item. */
  showKitchenNotes: boolean
  includeSystemRows: boolean
}

export type FinancialPreferences = {
  documentKind: FinancialDocumentKind
  showBeverageAppendix: boolean
  showBeverageNotes: boolean
  showChargeBreakdown: boolean
  showPaymentStatus: boolean
  /** Present chosen food timeblocks as alternative packages, on their own page. */
  showFoodPackages: boolean
  foodPackageTimeblockIds: string[]
  foodPackageEstimateMode: FoodPackageEstimateMode
}

export type CartDiagramPreferences = Record<string, never>

export type PreviewPreferencesState = {
  beo: BeoPreferences
  "beo-food": FoodBeoPreferences
  timeline: TimelinePreferences
  "financial-report": FinancialPreferences
  "cart-diagram": CartDiagramPreferences
  /** Tracks which data-derived defaults have been applied once. */
  defaultsApplied: {
    /** Per section, so one slow or failed section does not hold back the others. */
    beoTimeblocks: Record<BeoTimeblockSectionId, boolean>
    foodBeoTimeblocks: boolean
    financialPayments: boolean
    financialFoodPackages: boolean
  }
}

export type PreviewPreferencesAction =
  | { type: "beo/setShowContactInfo"; value: boolean }
  | { type: "beo/setShowInternalNotes"; value: boolean }
  | { type: "beo/setShowKitchenNotes"; value: boolean }
  | { type: "beo/setShowPricing"; value: boolean }
  | { type: "beo/setSectionVisible"; section: keyof BeoPreferences["sections"]; value: boolean }
  | { type: "beo/setTimeblockSelected"; section: BeoTimeblockSectionId; id: string; value: boolean }
  | { type: "beo/selectAllTimeblocks"; section: BeoTimeblockSectionId; ids: string[] }
  | { type: "beo/clearAllTimeblocks"; section: BeoTimeblockSectionId }
  | { type: "beo/applyDefaultTimeblocks"; section: BeoTimeblockSectionId; ids: string[] }
  | { type: "beo-food/setShowContactInfo"; value: boolean }
  | { type: "beo-food/setShowInternalNotes"; value: boolean }
  | { type: "beo-food/setShowKitchenNotes"; value: boolean }
  | { type: "beo-food/setShowPricing"; value: boolean }
  | { type: "beo-food/setTimeblockSelected"; id: string; value: boolean }
  | { type: "beo-food/selectAllTimeblocks"; ids: string[] }
  | { type: "beo-food/clearAllTimeblocks" }
  | { type: "beo-food/applyDefaultTimeblocks"; ids: string[] }
  | { type: "timeline/setShowInternalNotes"; value: boolean }
  | { type: "timeline/setShowKitchenNotes"; value: boolean }
  | { type: "timeline/setIncludeSystemRows"; value: boolean }
  | { type: "financial/setDocumentKind"; value: FinancialDocumentKind }
  | { type: "financial/setShowBeverageAppendix"; value: boolean }
  | { type: "financial/setShowBeverageNotes"; value: boolean }
  | { type: "financial/setShowChargeBreakdown"; value: boolean }
  | { type: "financial/setShowPaymentStatus"; value: boolean }
  | { type: "financial/applyPaymentDefault"; hasPayments: boolean }
  | { type: "financial/setShowFoodPackages"; value: boolean }
  | { type: "financial/setFoodPackageTimeblockSelected"; id: string; value: boolean }
  | { type: "financial/selectAllFoodPackageTimeblocks"; ids: string[] }
  | { type: "financial/clearAllFoodPackageTimeblocks" }
  | { type: "financial/applyDefaultFoodPackageTimeblocks"; ids: string[] }
  | { type: "financial/setFoodPackageEstimateMode"; value: FoodPackageEstimateMode }

function createInitialBeoPreferences(): BeoPreferences {
  return {
    showContactInfo: true,
    showInternalNotes: true,
    showKitchenNotes: true,
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

function createInitialFoodBeoPreferences(): FoodBeoPreferences {
  return {
    showContactInfo: false,
    showInternalNotes: true,
    showKitchenNotes: true,
    showPricing: false,
    selectedFoodTimeblockIds: [],
  }
}

function createInitialTimelinePreferences(): TimelinePreferences {
  return {
    showInternalNotes: true,
    showKitchenNotes: true,
    includeSystemRows: true,
  }
}

function createInitialFinancialPreferences(): FinancialPreferences {
  return {
    documentKind: DEFAULT_FINANCIAL_DOCUMENT_KIND,
    showBeverageAppendix: false,
    showBeverageNotes: false,
    showChargeBreakdown: true,
    showPaymentStatus: false,
    showFoodPackages: false,
    foodPackageTimeblockIds: [],
    foodPackageEstimateMode: DEFAULT_FOOD_PACKAGE_ESTIMATE_MODE,
  }
}

export function createInitialPreviewPreferences(): PreviewPreferencesState {
  return {
    beo: createInitialBeoPreferences(),
    "beo-food": createInitialFoodBeoPreferences(),
    timeline: createInitialTimelinePreferences(),
    "financial-report": createInitialFinancialPreferences(),
    "cart-diagram": {},
    defaultsApplied: {
      beoTimeblocks: { food: false, beverage: false, setup: false, notes: false },
      foodBeoTimeblocks: false,
      financialPayments: false,
      financialFoodPackages: false,
    },
  }
}
