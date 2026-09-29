import { describe, expect, it } from "vitest"

import type { Contact } from "~/definitions/contacts"

import {
  directoryContactToFormValues,
  EMPTY_DIRECTORY_CONTACT_FORM,
  formatDirectoryContactPlainText,
  toDirectoryContactPayload,
} from "./directoryContactForm"

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c-1",
    kind: "individual",
    firstName: "Sarah",
    lastName: "Kim",
    organizationName: null,
    displayName: "Sarah Kim",
    email: "sarah@example.com",
    emailNormalized: "sarah@example.com",
    phone: "555-1234",
    notes: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("directoryContactToFormValues", () => {
  it("seeds notes from the contact, defaulting to an empty string", () => {
    expect(directoryContactToFormValues(makeContact({ notes: "Prefers texts" })).notes).toBe("Prefers texts")
    expect(directoryContactToFormValues(makeContact({ notes: null })).notes).toBe("")
  })
})

describe("toDirectoryContactPayload", () => {
  it("trims and keeps non-blank notes", () => {
    const payload = toDirectoryContactPayload({ ...EMPTY_DIRECTORY_CONTACT_FORM, firstName: "Sarah", notes: "  Bills net-30  " })
    expect(payload.notes).toBe("Bills net-30")
  })

  it("saves blank notes as null", () => {
    const payload = toDirectoryContactPayload({ ...EMPTY_DIRECTORY_CONTACT_FORM, firstName: "Sarah", notes: "   " })
    expect(payload.notes).toBeNull()
  })

  it("still builds identity fields the same way toContactPayload does", () => {
    const payload = toDirectoryContactPayload({
      ...EMPTY_DIRECTORY_CONTACT_FORM,
      kind: "organization",
      organizationName: "Riverside AV",
      email: "info@riverside.test",
      notes: "",
    })
    expect(payload).toMatchObject({ kind: "organization", organizationName: "Riverside AV", email: "info@riverside.test" })
  })
})

describe("formatDirectoryContactPlainText", () => {
  it("includes name, email, phone and notes when present", () => {
    const text = formatDirectoryContactPlainText(makeContact({ notes: "Allergic to peanuts" }))
    expect(text).toBe("Sarah Kim\nEmail: sarah@example.com\nPhone: 555-1234\nNotes: Allergic to peanuts")
  })

  it("omits missing fields", () => {
    const text = formatDirectoryContactPlainText(makeContact({ email: null, phone: null, notes: null }))
    expect(text).toBe("Sarah Kim")
  })
})
