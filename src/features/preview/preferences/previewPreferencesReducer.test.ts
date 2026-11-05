import { describe, expect, it } from "vitest"

import {
  createInitialPreviewPreferences,
  previewPreferencesReducer,
} from "./previewPreferencesReducer"
import type { PreviewPreferencesAction, PreviewPreferencesState } from "./types"

type PreviewKey = Exclude<keyof PreviewPreferencesState, "defaultsApplied">
type SimpleCase = {
  [K in PreviewKey]: {
    action: PreviewPreferencesAction
    key: K
    expected: Partial<PreviewPreferencesState[K]>
  }
}[PreviewKey]

// Each simple setter changes exactly one field of one preview type.
const SIMPLE_CASES: SimpleCase[] = [
  { action: { type: "beo/setShowContactInfo", value: false }, key: "beo", expected: { showContactInfo: false } },
  { action: { type: "beo/setShowInternalNotes", value: false }, key: "beo", expected: { showInternalNotes: false } },
  { action: { type: "beo/setShowKitchenNotes", value: false }, key: "beo", expected: { showKitchenNotes: false } },
  { action: { type: "beo/setShowPricing", value: true }, key: "beo", expected: { showPricing: true } },
  { action: { type: "beo-food/setShowContactInfo", value: true }, key: "beo-food", expected: { showContactInfo: true } },
  { action: { type: "beo-food/setShowInternalNotes", value: false }, key: "beo-food", expected: { showInternalNotes: false } },
  { action: { type: "beo-food/setShowKitchenNotes", value: false }, key: "beo-food", expected: { showKitchenNotes: false } },
  { action: { type: "beo-food/setShowPricing", value: true }, key: "beo-food", expected: { showPricing: true } },
  { action: { type: "timeline/setShowInternalNotes", value: false }, key: "timeline", expected: { showInternalNotes: false } },
  { action: { type: "timeline/setShowKitchenNotes", value: false }, key: "timeline", expected: { showKitchenNotes: false } },
  { action: { type: "timeline/setIncludeSystemRows", value: false }, key: "timeline", expected: { includeSystemRows: false } },
  { action: { type: "financial/setDocumentKind", value: "invoice" }, key: "financial-report", expected: { documentKind: "invoice" } },
  { action: { type: "financial/setShowBeverageAppendix", value: true }, key: "financial-report", expected: { showBeverageAppendix: true } },
  { action: { type: "financial/setShowBeverageNotes", value: false }, key: "financial-report", expected: { showBeverageNotes: false } },
  { action: { type: "financial/setShowChargeBreakdown", value: false }, key: "financial-report", expected: { showChargeBreakdown: false } },
  { action: { type: "financial/setShowPaymentStatus", value: true }, key: "financial-report", expected: { showPaymentStatus: true } },
  { action: { type: "financial/setShowFoodPackages", value: true }, key: "financial-report", expected: { showFoodPackages: true } },
]

describe("previewPreferencesReducer", () => {
  it("isolates preference updates per preview type", () => {
    const initial = createInitialPreviewPreferences()
    const next = previewPreferencesReducer(initial, {
      type: "beo/setShowPricing",
      value: true,
    })

    expect(next.beo.showPricing).toBe(true)
    expect(next["beo-food"].showPricing).toBe(false)
    expect(next.timeline.includeSystemRows).toBe(true)
  })

  it("preserves timeblock selections when a parent section is hidden", () => {
    let state = createInitialPreviewPreferences()
    state = previewPreferencesReducer(state, {
      type: "beo/selectAllTimeblocks",
      section: "food",
      ids: ["f1", "f2"],
    })
    state = previewPreferencesReducer(state, {
      type: "beo/setSectionVisible",
      section: "food",
      value: false,
    })

    expect(state.beo.sections.food).toBe(false)
    expect(state.beo.selectedTimeblockIds.food).toEqual(["f1", "f2"])
  })

  it("applies data-derived defaults only once per section", () => {
    let state = createInitialPreviewPreferences()
    state = previewPreferencesReducer(state, {
      type: "beo/applyDefaultTimeblocks",
      section: "food",
      ids: ["f1"],
    })
    state = previewPreferencesReducer(state, {
      type: "beo/applyDefaultTimeblocks",
      section: "food",
      ids: ["f2"],
    })
    state = previewPreferencesReducer(state, {
      type: "beo/applyDefaultTimeblocks",
      section: "beverage",
      ids: ["b1"],
    })

    expect(state.beo.selectedTimeblockIds.food).toEqual(["f1"])
    expect(state.beo.selectedTimeblockIds.beverage).toEqual(["b1"])
    expect(state.defaultsApplied.beoTimeblocks).toEqual({
      food: true, beverage: true, setup: false, notes: false,
    })
  })

  it("defaults the financial report to an estimate and switches its title", () => {
    let state = createInitialPreviewPreferences()
    expect(state["financial-report"].documentKind).toBe("estimate")

    state = previewPreferencesReducer(state, {
      type: "financial/setDocumentKind",
      value: "invoice",
    })
    expect(state["financial-report"].documentKind).toBe("invoice")
    expect(state["financial-report"].showChargeBreakdown).toBe(true)
  })

  it("defaults financial payment status from whether payments exist", () => {
    let state = createInitialPreviewPreferences()
    expect(state["financial-report"].showPaymentStatus).toBe(false)

    state = previewPreferencesReducer(state, {
      type: "financial/applyPaymentDefault",
      hasPayments: true,
    })
    expect(state["financial-report"].showPaymentStatus).toBe(true)

    state = previewPreferencesReducer(state, {
      type: "financial/applyPaymentDefault",
      hasPayments: false,
    })
    expect(state["financial-report"].showPaymentStatus).toBe(true)
  })

  it("supports select-all and clear-all for timeblocks", () => {
    let state = createInitialPreviewPreferences()
    state = previewPreferencesReducer(state, {
      type: "beo/selectAllTimeblocks",
      section: "notes",
      ids: ["n1", "n2"],
    })
    expect(state.beo.selectedTimeblockIds.notes).toEqual(["n1", "n2"])

    state = previewPreferencesReducer(state, {
      type: "beo/clearAllTimeblocks",
      section: "notes",
    })
    expect(state.beo.selectedTimeblockIds.notes).toEqual([])
  })

  it("shows kitchen notes by default and toggles them per preview type", () => {
    let state = createInitialPreviewPreferences()
    expect(state.beo.showKitchenNotes).toBe(true)
    expect(state.timeline.showKitchenNotes).toBe(true)
    expect(state["beo-food"].showKitchenNotes).toBe(true)

    state = previewPreferencesReducer(state, { type: "beo-food/setShowKitchenNotes", value: false })
    expect(state["beo-food"].showKitchenNotes).toBe(false)
    expect(state["beo-food"].showInternalNotes).toBe(true)
    expect(state.beo.showKitchenNotes).toBe(true)

    state = previewPreferencesReducer(state, { type: "beo/setShowKitchenNotes", value: false })
    expect(state.beo.showKitchenNotes).toBe(false)
    expect(state.beo.showInternalNotes).toBe(true)
    expect(state.timeline.showKitchenNotes).toBe(true)

    state = previewPreferencesReducer(state, { type: "timeline/setShowKitchenNotes", value: false })
    expect(state.timeline.showKitchenNotes).toBe(false)
    expect(state.timeline.showInternalNotes).toBe(true)
  })

  it("handles food package options, applying the default selection only once", () => {
    let state = createInitialPreviewPreferences()
    expect(state["financial-report"].showFoodPackages).toBe(false)
    expect(state["financial-report"].foodPackageEstimateMode).toBe("ignore")

    state = previewPreferencesReducer(state, { type: "financial/applyDefaultFoodPackageTimeblocks", ids: ["a", "b"] })
    expect(state["financial-report"].foodPackageTimeblockIds).toEqual(["a", "b"])
    expect(state.defaultsApplied.financialFoodPackages).toBe(true)

    state = previewPreferencesReducer(state, { type: "financial/setFoodPackageTimeblockSelected", id: "a", value: false })
    expect(state["financial-report"].foodPackageTimeblockIds).toEqual(["b"])

    state = previewPreferencesReducer(state, { type: "financial/applyDefaultFoodPackageTimeblocks", ids: ["a", "b", "c"] })
    expect(state["financial-report"].foodPackageTimeblockIds).toEqual(["b"])

    state = previewPreferencesReducer(state, { type: "financial/selectAllFoodPackageTimeblocks", ids: ["a", "b", "c"] })
    expect(state["financial-report"].foodPackageTimeblockIds).toEqual(["a", "b", "c"])
    state = previewPreferencesReducer(state, { type: "financial/clearAllFoodPackageTimeblocks" })
    expect(state["financial-report"].foodPackageTimeblockIds).toEqual([])

    state = previewPreferencesReducer(state, { type: "financial/setShowFoodPackages", value: true })
    state = previewPreferencesReducer(state, { type: "financial/setFoodPackageEstimateMode", value: "list" })
    expect(state["financial-report"].showFoodPackages).toBe(true)
    expect(state["financial-report"].foodPackageEstimateMode).toBe("list")
    expect(state["financial-report"].showBeverageAppendix).toBe(false)
  })

  it.each(SIMPLE_CASES)("$action.type updates only its own field", ({ action, key, expected }) => {
    const initial = createInitialPreviewPreferences()
    const next = previewPreferencesReducer(initial, action)

    expect(next).toEqual({ ...initial, [key]: { ...initial[key], ...expected } })
  })

  it("toggles, selects and clears Full BEO timeblocks per section", () => {
    let state = createInitialPreviewPreferences()
    state = previewPreferencesReducer(state, { type: "beo/setTimeblockSelected", section: "setup", id: "s1", value: true })
    state = previewPreferencesReducer(state, { type: "beo/setTimeblockSelected", section: "setup", id: "s1", value: true })
    state = previewPreferencesReducer(state, { type: "beo/setTimeblockSelected", section: "setup", id: "s2", value: true })
    expect(state.beo.selectedTimeblockIds.setup).toEqual(["s1", "s2"])

    state = previewPreferencesReducer(state, { type: "beo/setTimeblockSelected", section: "setup", id: "s1", value: false })
    expect(state.beo.selectedTimeblockIds).toEqual({ food: [], beverage: [], setup: ["s2"], notes: [] })
  })

  it("toggles, selects and clears Food BEO timeblocks, and applies its default once", () => {
    let state = createInitialPreviewPreferences()
    state = previewPreferencesReducer(state, { type: "beo-food/applyDefaultTimeblocks", ids: ["f1", "f2"] })
    expect(state["beo-food"].selectedFoodTimeblockIds).toEqual(["f1", "f2"])
    expect(state.defaultsApplied.foodBeoTimeblocks).toBe(true)

    state = previewPreferencesReducer(state, { type: "beo-food/applyDefaultTimeblocks", ids: ["f3"] })
    expect(state["beo-food"].selectedFoodTimeblockIds).toEqual(["f1", "f2"])

    state = previewPreferencesReducer(state, { type: "beo-food/setTimeblockSelected", id: "f1", value: false })
    expect(state["beo-food"].selectedFoodTimeblockIds).toEqual(["f2"])

    state = previewPreferencesReducer(state, { type: "beo-food/clearAllTimeblocks" })
    expect(state["beo-food"].selectedFoodTimeblockIds).toEqual([])

    state = previewPreferencesReducer(state, { type: "beo-food/selectAllTimeblocks", ids: ["f1", "f3"] })
    expect(state["beo-food"].selectedFoodTimeblockIds).toEqual(["f1", "f3"])
    expect(state.beo.selectedTimeblockIds.food).toEqual([])
  })
})
