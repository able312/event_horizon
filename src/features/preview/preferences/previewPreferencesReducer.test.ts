import { describe, expect, it } from "vitest"

import {
  createInitialPreviewPreferences,
  previewPreferencesReducer,
} from "./previewPreferencesReducer"

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
})
