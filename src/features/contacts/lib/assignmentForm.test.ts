import { describe, expect, it } from "vitest"

import type { EventContactsPanelItem } from "~/definitions/contacts"

import {
  assignmentFromPanelItem,
  getAssignmentError,
  toAssignmentPatch,
  toAssignOptions,
} from "./assignmentForm"

describe("assignment form", () => {
  it("requires a category for vendors only", () => {
    expect(getAssignmentError({ role: "vendor", vendorCategoryId: null, roleLabel: "" })).toBeDefined()
    expect(getAssignmentError({ role: "vendor", vendorCategoryId: "cat-1", roleLabel: "" })).toBeUndefined()
    expect(getAssignmentError({ role: "client", vendorCategoryId: null, roleLabel: "" })).toBeUndefined()
  })

  it("never sends a category for non-vendor roles and cleans the label", () => {
    expect(toAssignOptions({ role: "client", vendorCategoryId: "stale", roleLabel: "  Bride " })).toEqual({
      vendorCategoryId: null,
      roleLabel: "Bride",
    })
    expect(toAssignOptions({ role: "vendor", vendorCategoryId: "cat-1", roleLabel: "" })).toEqual({
      vendorCategoryId: "cat-1",
      roleLabel: null,
    })
  })

  it("only patches the category for vendors", () => {
    expect(toAssignmentPatch({ role: "coordinator", vendorCategoryId: null, roleLabel: "Lead" })).toEqual({
      roleLabel: "Lead",
    })
    expect(toAssignmentPatch({ role: "vendor", vendorCategoryId: "cat-2", roleLabel: "" })).toEqual({
      vendorCategoryId: "cat-2",
      roleLabel: null,
    })
  })

  it("seeds values from a panel row", () => {
    const item = {
      roleLabel: null,
      vendorCategory: { id: "cat-1", label: "Catering", colorToken: "teal" },
    } as EventContactsPanelItem

    expect(assignmentFromPanelItem("vendor", item)).toEqual({ role: "vendor", vendorCategoryId: "cat-1", roleLabel: "" })
  })
})
