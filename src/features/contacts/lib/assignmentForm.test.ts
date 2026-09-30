import { describe, expect, it } from "vitest"

import type { EventContactsPanelItem } from "~/definitions/contacts"

import {
  assignmentFromPanelItem,
  DEFAULT_ASSIGNMENT,
  getAssignmentError,
  toAssignmentPatch,
  toAssignOptions,
} from "./assignmentForm"

describe("assignment form", () => {
  it("requires a category for vendors only", () => {
    expect(getAssignmentError({ ...DEFAULT_ASSIGNMENT, role: "vendor" })).toBeDefined()
    expect(getAssignmentError({ ...DEFAULT_ASSIGNMENT, role: "vendor", vendorCategoryId: "cat-1" })).toBeUndefined()
    expect(getAssignmentError({ ...DEFAULT_ASSIGNMENT, role: "client" })).toBeUndefined()
  })

  it("never sends a category for non-vendor roles and cleans the label and notes", () => {
    expect(
      toAssignOptions({ role: "client", vendorCategoryId: "stale", roleLabel: "  Bride ", notes: " Call first " }),
    ).toEqual({
      vendorCategoryId: null,
      roleLabel: "Bride",
      notes: "Call first",
    })
    expect(toAssignOptions({ role: "vendor", vendorCategoryId: "cat-1", roleLabel: "", notes: "" })).toEqual({
      vendorCategoryId: "cat-1",
      roleLabel: null,
      notes: null,
    })
  })

  it("only patches the category for vendors", () => {
    expect(toAssignmentPatch({ role: "coordinator", vendorCategoryId: null, roleLabel: "Lead", notes: "" })).toEqual({
      roleLabel: "Lead",
      notes: null,
    })
    expect(
      toAssignmentPatch({ role: "vendor", vendorCategoryId: "cat-2", roleLabel: "", notes: "Time: 18:30" }),
    ).toEqual({
      vendorCategoryId: "cat-2",
      roleLabel: null,
      notes: "Time: 18:30",
    })
  })

  it("seeds values from a panel row", () => {
    const item = {
      roleLabel: null,
      notes: "Time: 18:30",
      vendorCategory: { id: "cat-1", label: "Catering", colorToken: "teal" },
    } as EventContactsPanelItem

    expect(assignmentFromPanelItem("vendor", item)).toEqual({
      role: "vendor",
      vendorCategoryId: "cat-1",
      roleLabel: "",
      notes: "Time: 18:30",
    })
  })
})
