import { describe, expect, it } from "vitest"

import type { ContactWithRoles, EventContactsPanel, EventContactsPanelItem } from "~/definitions/contacts"
import { ContactsError } from "~/lib/contacts/contactsError"

import {
  describeAssignment,
  describeStandingRoles,
  formatContactPlainText,
  getContactsErrorMessage,
  isAlreadyAssigned,
  pruneSelection,
  toggleGroupSelection,
  toggleId,
} from "./eventContactsPanel"

const catering = { id: "cat-1", label: "Catering", colorToken: "teal" }

function item(overrides: Partial<EventContactsPanelItem>): EventContactsPanelItem {
  return {
    eventContactId: "ec-1",
    contactId: "c-1",
    displayName: "Sarah Kim",
    initials: "SK",
    email: null,
    phone: null,
    roleLabel: null,
    vendorCategory: null,
    isPrimary: false,
    contactArchived: false,
    ...overrides,
  }
}

const panel: EventContactsPanel = {
  eventId: "e-1",
  groups: [
    { role: "client", items: [item({ eventContactId: "ec-1", contactId: "c-1" })] },
    { role: "coordinator", items: [] },
    { role: "vendor", items: [item({ eventContactId: "ec-2", contactId: "c-2", vendorCategory: catering })] },
  ],
}

describe("event contacts panel helpers", () => {
  it("drops selections that are no longer on the panel", () => {
    expect([...pruneSelection(new Set(["ec-1", "ec-gone"]), panel)]).toEqual(["ec-1"])
    expect(pruneSelection(new Set(["ec-1"]), undefined).size).toBe(0)
  })

  it("toggles single ids and whole groups", () => {
    expect([...toggleId(new Set(["a"]), "b")]).toEqual(["a", "b"])
    expect([...toggleId(new Set(["a", "b"]), "a")]).toEqual(["b"])

    // Partially selected group -> select all
    expect([...toggleGroupSelection(new Set(["a"]), ["a", "b"])].sort()).toEqual(["a", "b"])
    // Fully selected group -> clear it, leaving other groups alone
    expect([...toggleGroupSelection(new Set(["a", "b", "z"]), ["a", "b"])]).toEqual(["z"])
  })

  it("detects duplicate assignments by role and, for vendors, category", () => {
    expect(isAlreadyAssigned(panel, "c-1", "client", null)).toBe(true)
    expect(isAlreadyAssigned(panel, "c-1", "coordinator", null)).toBe(false)
    expect(isAlreadyAssigned(panel, "c-2", "vendor", "cat-1")).toBe(true)
    expect(isAlreadyAssigned(panel, "c-2", "vendor", "cat-2")).toBe(false)
    expect(isAlreadyAssigned(undefined, "c-1", "client", null)).toBe(false)
  })

  it("summarises standing roles", () => {
    const contact = {
      roles: [
        { id: "r1", role: "client", vendorCategory: null },
        { id: "r2", role: "vendor", vendorCategory: catering },
      ],
    } as ContactWithRoles
    expect(describeStandingRoles(contact)).toBe("Client · Catering vendor")
  })

  it("describes an assignment and formats it as plain text", () => {
    expect(describeAssignment("client", item({}))).toBe("Client")
    expect(describeAssignment("client", item({ roleLabel: "Bride" }))).toBe("Bride")

    const vendor = item({ vendorCategory: catering, roleLabel: "Chef", email: "chef@example.com" })
    expect(formatContactPlainText("vendor", vendor)).toBe("Sarah Kim · Chef (Catering)\nEmail: chef@example.com")
  })

  it("uses ContactsError messages and falls back for anything else", () => {
    expect(getContactsErrorMessage(new ContactsError("DuplicateAssignment", "Already on event"), "x")).toBe(
      "Already on event",
    )
    expect(getContactsErrorMessage(new Error("boom"), "Fallback")).toBe("Fallback")
  })
})
