import type { PreviewPreferencesAction, PreviewPreferencesState } from "./types"
import { createInitialPreviewPreferences } from "./types"

function toggleId(ids: string[], id: string, value: boolean): string[] {
  if (value) {
    return ids.includes(id) ? ids : [...ids, id]
  }
  return ids.filter((entry) => entry !== id)
}

export function previewPreferencesReducer(
  state: PreviewPreferencesState,
  action: PreviewPreferencesAction,
): PreviewPreferencesState {
  switch (action.type) {
    case "beo/setShowContactInfo":
      return { ...state, beo: { ...state.beo, showContactInfo: action.value } }
    case "beo/setShowInternalNotes":
      return { ...state, beo: { ...state.beo, showInternalNotes: action.value } }
    case "beo/setShowPricing":
      return { ...state, beo: { ...state.beo, showPricing: action.value } }
    case "beo/setSectionVisible":
      return {
        ...state,
        beo: {
          ...state.beo,
          sections: { ...state.beo.sections, [action.section]: action.value },
        },
      }
    case "beo/setTimeblockSelected":
      return {
        ...state,
        beo: {
          ...state.beo,
          selectedTimeblockIds: {
            ...state.beo.selectedTimeblockIds,
            [action.section]: toggleId(
              state.beo.selectedTimeblockIds[action.section],
              action.id,
              action.value,
            ),
          },
        },
      }
    case "beo/selectAllTimeblocks":
      return {
        ...state,
        beo: {
          ...state.beo,
          selectedTimeblockIds: {
            ...state.beo.selectedTimeblockIds,
            [action.section]: [...action.ids],
          },
        },
      }
    case "beo/clearAllTimeblocks":
      return {
        ...state,
        beo: {
          ...state.beo,
          selectedTimeblockIds: {
            ...state.beo.selectedTimeblockIds,
            [action.section]: [],
          },
        },
      }
    case "beo/applyDefaultTimeblocks":
      if (state.defaultsApplied.beoTimeblocks) return state
      return {
        ...state,
        beo: {
          ...state.beo,
          selectedTimeblockIds: {
            food: [...action.selections.food],
            beverage: [...action.selections.beverage],
            setup: [...action.selections.setup],
            notes: [...action.selections.notes],
          },
        },
        defaultsApplied: { ...state.defaultsApplied, beoTimeblocks: true },
      }
    case "beo-food/setShowContactInfo":
      return {
        ...state,
        "beo-food": { ...state["beo-food"], showContactInfo: action.value },
      }
    case "beo-food/setShowInternalNotes":
      return {
        ...state,
        "beo-food": { ...state["beo-food"], showInternalNotes: action.value },
      }
    case "beo-food/setShowPricing":
      return {
        ...state,
        "beo-food": { ...state["beo-food"], showPricing: action.value },
      }
    case "beo-food/setTimeblockSelected":
      return {
        ...state,
        "beo-food": {
          ...state["beo-food"],
          selectedFoodTimeblockIds: toggleId(
            state["beo-food"].selectedFoodTimeblockIds,
            action.id,
            action.value,
          ),
        },
      }
    case "beo-food/selectAllTimeblocks":
      return {
        ...state,
        "beo-food": {
          ...state["beo-food"],
          selectedFoodTimeblockIds: [...action.ids],
        },
      }
    case "beo-food/clearAllTimeblocks":
      return {
        ...state,
        "beo-food": {
          ...state["beo-food"],
          selectedFoodTimeblockIds: [],
        },
      }
    case "beo-food/applyDefaultTimeblocks":
      if (state.defaultsApplied.foodBeoTimeblocks) return state
      return {
        ...state,
        "beo-food": {
          ...state["beo-food"],
          selectedFoodTimeblockIds: [...action.ids],
        },
        defaultsApplied: { ...state.defaultsApplied, foodBeoTimeblocks: true },
      }
    case "timeline/setShowInternalNotes":
      return {
        ...state,
        timeline: { ...state.timeline, showInternalNotes: action.value },
      }
    case "timeline/setIncludeSystemRows":
      return {
        ...state,
        timeline: { ...state.timeline, includeSystemRows: action.value },
      }
    case "financial/setShowBeverageAppendix":
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showBeverageAppendix: action.value,
        },
      }
    case "financial/setShowBeverageNotes":
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showBeverageNotes: action.value,
        },
      }
    case "financial/setShowChargeBreakdown":
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showChargeBreakdown: action.value,
        },
      }
    case "financial/setShowPaymentStatus":
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showPaymentStatus: action.value,
        },
      }
    case "financial/applyPaymentDefault":
      if (state.defaultsApplied.financialPayments) return state
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showPaymentStatus: action.hasPayments,
        },
        defaultsApplied: { ...state.defaultsApplied, financialPayments: true },
      }
    default:
      return state
  }
}

export { createInitialPreviewPreferences }
