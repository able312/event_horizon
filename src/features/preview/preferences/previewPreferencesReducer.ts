import type {
  BeoTimeblockSectionId,
  PreviewPreferencesAction,
  PreviewPreferencesState,
} from "./types"
import { createInitialPreviewPreferences } from "./types"

function toggleId(ids: string[], id: string, value: boolean): string[] {
  if (value) {
    return ids.includes(id) ? ids : [...ids, id]
  }
  return ids.filter((entry) => entry !== id)
}

type PreviewKey = Exclude<keyof PreviewPreferencesState, "defaultsApplied">

/** Merges updates into one preview type's preferences. */
function withPreview<K extends PreviewKey>(
  state: PreviewPreferencesState,
  key: K,
  updates: Partial<PreviewPreferencesState[K]>,
): PreviewPreferencesState {
  return { ...state, [key]: { ...state[key], ...updates } }
}

/** Replaces the Full BEO's selected timeblock ids for one section. */
function withBeoTimeblockIds(
  state: PreviewPreferencesState,
  section: BeoTimeblockSectionId,
  ids: string[],
): PreviewPreferencesState {
  return withPreview(state, "beo", {
    selectedTimeblockIds: { ...state.beo.selectedTimeblockIds, [section]: ids },
  })
}

export function previewPreferencesReducer(
  state: PreviewPreferencesState,
  action: PreviewPreferencesAction,
): PreviewPreferencesState {
  switch (action.type) {
    case "beo/setShowContactInfo":
      return withPreview(state, "beo", { showContactInfo: action.value })
    case "beo/setShowInternalNotes":
      return withPreview(state, "beo", { showInternalNotes: action.value })
    case "beo/setShowKitchenNotes":
      return withPreview(state, "beo", { showKitchenNotes: action.value })
    case "beo/setShowPricing":
      return withPreview(state, "beo", { showPricing: action.value })
    case "beo/setSectionVisible":
      return withPreview(state, "beo", {
        sections: { ...state.beo.sections, [action.section]: action.value },
      })
    case "beo/setTimeblockSelected":
      return withBeoTimeblockIds(
        state,
        action.section,
        toggleId(state.beo.selectedTimeblockIds[action.section], action.id, action.value),
      )
    case "beo/selectAllTimeblocks":
      return withBeoTimeblockIds(state, action.section, [...action.ids])
    case "beo/clearAllTimeblocks":
      return withBeoTimeblockIds(state, action.section, [])
    case "beo/applyDefaultTimeblocks":
      if (state.defaultsApplied.beoTimeblocks[action.section]) return state
      return {
        ...withBeoTimeblockIds(state, action.section, [...action.ids]),
        defaultsApplied: {
          ...state.defaultsApplied,
          beoTimeblocks: { ...state.defaultsApplied.beoTimeblocks, [action.section]: true },
        },
      }
    case "beo-food/setShowContactInfo":
      return withPreview(state, "beo-food", { showContactInfo: action.value })
    case "beo-food/setShowInternalNotes":
      return withPreview(state, "beo-food", { showInternalNotes: action.value })
    case "beo-food/setShowKitchenNotes":
      return withPreview(state, "beo-food", { showKitchenNotes: action.value })
    case "beo-food/setShowPricing":
      return withPreview(state, "beo-food", { showPricing: action.value })
    case "beo-food/setTimeblockSelected":
      return withPreview(state, "beo-food", {
        selectedFoodTimeblockIds: toggleId(
          state["beo-food"].selectedFoodTimeblockIds,
          action.id,
          action.value,
        ),
      })
    case "beo-food/selectAllTimeblocks":
      return withPreview(state, "beo-food", { selectedFoodTimeblockIds: [...action.ids] })
    case "beo-food/clearAllTimeblocks":
      return withPreview(state, "beo-food", { selectedFoodTimeblockIds: [] })
    case "beo-food/applyDefaultTimeblocks":
      if (state.defaultsApplied.foodBeoTimeblocks) return state
      return {
        ...withPreview(state, "beo-food", { selectedFoodTimeblockIds: [...action.ids] }),
        defaultsApplied: { ...state.defaultsApplied, foodBeoTimeblocks: true },
      }
    case "timeline/setShowInternalNotes":
      return withPreview(state, "timeline", { showInternalNotes: action.value })
    case "timeline/setShowKitchenNotes":
      return withPreview(state, "timeline", { showKitchenNotes: action.value })
    case "timeline/setIncludeSystemRows":
      return withPreview(state, "timeline", { includeSystemRows: action.value })
    case "financial/setShowBeverageAppendix":
      return withPreview(state, "financial-report", { showBeverageAppendix: action.value })
    case "financial/setShowBeverageNotes":
      return withPreview(state, "financial-report", { showBeverageNotes: action.value })
    case "financial/setShowChargeBreakdown":
      return withPreview(state, "financial-report", { showChargeBreakdown: action.value })
    case "financial/setShowFoodPackages":
      return withPreview(state, "financial-report", { showFoodPackages: action.value })
    case "financial/setFoodPackageTimeblockSelected":
      return withPreview(state, "financial-report", {
        foodPackageTimeblockIds: toggleId(
          state["financial-report"].foodPackageTimeblockIds,
          action.id,
          action.value,
        ),
      })
    case "financial/selectAllFoodPackageTimeblocks":
      return withPreview(state, "financial-report", { foodPackageTimeblockIds: [...action.ids] })
    case "financial/clearAllFoodPackageTimeblocks":
      return withPreview(state, "financial-report", { foodPackageTimeblockIds: [] })
    case "financial/applyDefaultFoodPackageTimeblocks":
      if (state.defaultsApplied.financialFoodPackages) return state
      return {
        ...withPreview(state, "financial-report", { foodPackageTimeblockIds: [...action.ids] }),
        defaultsApplied: { ...state.defaultsApplied, financialFoodPackages: true },
      }
    case "financial/setFoodPackageEstimateMode":
      return withPreview(state, "financial-report", { foodPackageEstimateMode: action.value })
    case "invoice/setShowChargeBreakdown":
      return withPreview(state, "invoice", { showChargeBreakdown: action.value })
    case "invoice/setShowPaymentStatus":
      return withPreview(state, "invoice", { showPaymentStatus: action.value })
    case "invoice/applyPaymentDefault":
      if (state.defaultsApplied.invoicePayments) return state
      return {
        ...withPreview(state, "invoice", { showPaymentStatus: action.hasPayments }),
        defaultsApplied: { ...state.defaultsApplied, invoicePayments: true },
      }
    default:
      return state
  }
}

export { createInitialPreviewPreferences }
