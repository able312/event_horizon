import { describe, expect, it } from "vitest"

import {
  assertRoleCategory,
  buildRecipientResolution,
  deriveDisplayName,
  deriveInitials,
  groupPanelItems,
  isValidEmail,
  normalizeEmail,
} from "./contactRules"
import { ContactsError } from "./contactsError"
import type { EventContactsPanelItem } from "~/definitions/contacts"

describe("contact rules", () => {
  it("normalizes email by trimming and lower-casing, blank becomes null", () => {
    expect(normalizeEmail("  Sarah@Example.COM ")).toBe("sarah@example.com")
    expect(normalizeEmail("   ")).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
  })

  it("validates email format", () => {
    expect(isValidEmail("sarah@example.com")).toBe(true)
    expect(isValidEmail("sarah@example")).toBe(false)
    expect(isValidEmail("sarah example@x.com")).toBe(false)
  })

  it("derives display names per kind", () => {
    expect(
      deriveDisplayName({ kind: "individual", firstName: " Sarah ", lastName: "Kim", organizationName: "Acme" }),
    ).toBe("Sarah Kim")
    expect(deriveDisplayName({ kind: "individual", firstName: "Sarah", lastName: null, organizationName: null })).toBe(
      "Sarah",
    )
    expect(
      deriveDisplayName({ kind: "organization", firstName: "Sarah", lastName: "Kim", organizationName: "Riverside AV" }),
    ).toBe("Riverside AV")
    expect(deriveDisplayName({ kind: "organization", firstName: "Sarah", lastName: null, organizationName: "" })).toBeNull()
  })

  it("derives initials from the first and last words", () => {
    expect(deriveInitials("Sarah Kim")).toBe("SK")
    expect(deriveInitials("Mary Jane van Dyke")).toBe("MD")
    expect(deriveInitials("riverside")).toBe("R")
    expect(deriveInitials("   ")).toBe("?")
    expect(deriveInitials(null)).toBe("?")
  })

  it("requires a category for vendors and forbids it otherwise", () => {
    expect(() => assertRoleCategory("vendor", "cat-1")).not.toThrow()
    expect(() => assertRoleCategory("client", null)).not.toThrow()

    const missing = (() => {
      try {
        assertRoleCategory("vendor", null)
      } catch (err) {
        return err
      }
    })()
    expect(missing).toBeInstanceOf(ContactsError)
    expect((missing as ContactsError).code).toBe("InvalidRoleCategory")

    expect(() => assertRoleCategory("client", "cat-1")).toThrow(ContactsError)
    expect(() => assertRoleCategory("guest" as "client", null)).toThrow(/Unknown contact role/)
  })

  it("groups panel rows in fixed role order and keeps empty groups", () => {
    const item = (id: string) => ({ eventContactId: id }) as EventContactsPanelItem
    const groups = groupPanelItems([
      { role: "vendor", item: item("v1") },
      { role: "client", item: item("c1") },
      { role: "vendor", item: item("v2") },
    ])

    expect(groups.map((group) => group.role)).toEqual(["client", "coordinator", "vendor"])
    expect(groups[0]!.items.map((i) => i.eventContactId)).toEqual(["c1"])
    expect(groups[1]!.items).toEqual([])
    expect(groups[2]!.items.map((i) => i.eventContactId)).toEqual(["v1", "v2"])
  })

  it("de-duplicates recipients by normalized email and reports skipped contacts once", () => {
    const resolution = buildRecipientResolution([
      { contactId: "a", displayName: "Sarah Kim", email: " Sarah@Example.com " },
      { contactId: "b", displayName: "Sarah (dup)", email: "sarah@example.com" },
      { contactId: "c", displayName: "No Email", email: null },
      { contactId: "c", displayName: "No Email", email: "" },
      { contactId: "d", displayName: "DJ Mo", email: "mo@example.com" },
    ])

    expect(resolution.recipients).toEqual([
      { contactId: "a", displayName: "Sarah Kim", email: "Sarah@Example.com" },
      { contactId: "d", displayName: "DJ Mo", email: "mo@example.com" },
    ])
    expect(resolution.skipped).toEqual([{ contactId: "c", displayName: "No Email" }])
  })

  it("round-trips ContactsError through its IPC payload", () => {
    const original = new ContactsError("EmailTaken", "taken", "contact-1")
    const rebuilt = ContactsError.fromPayload(original.toPayload())

    expect(rebuilt).toBeInstanceOf(ContactsError)
    expect(rebuilt.code).toBe("EmailTaken")
    expect(rebuilt.existingContactId).toBe("contact-1")
    expect(new ContactsError("NotFound", "x").toPayload()).toEqual({ code: "NotFound", message: "x" })
  })
})
