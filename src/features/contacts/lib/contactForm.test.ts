import { describe, expect, it } from "vitest"

import type { Contact } from "~/definitions/contacts"

import {
  contactToFormValues,
  EMPTY_CONTACT_FORM,
  formValuesFromSearch,
  hasFormErrors,
  toContactPayload,
  validateContactForm,
} from "./contactForm"

describe("contact form", () => {
  it("seeds the form from a search query", () => {
    expect(formValuesFromSearch("  ")).toEqual(EMPTY_CONTACT_FORM)
    expect(formValuesFromSearch("sarah@example.com")).toEqual({ ...EMPTY_CONTACT_FORM, email: "sarah@example.com" })
    expect(formValuesFromSearch("Mary Jane Watson")).toEqual({
      ...EMPTY_CONTACT_FORM,
      firstName: "Mary",
      lastName: "Jane Watson",
    })
    expect(formValuesFromSearch("Sarah")).toEqual({ ...EMPTY_CONTACT_FORM, firstName: "Sarah" })
  })

  it("requires a name for the chosen kind", () => {
    expect(validateContactForm(EMPTY_CONTACT_FORM).name).toMatch(/first or last name/)
    expect(validateContactForm({ ...EMPTY_CONTACT_FORM, lastName: "Kim" })).toEqual({})

    const orgWithPersonOnly = { ...EMPTY_CONTACT_FORM, kind: "organization" as const, firstName: "Sarah" }
    expect(validateContactForm(orgWithPersonOnly).name).toMatch(/Organization name/)
  })

  it("flags malformed emails but allows a blank one", () => {
    const base = { ...EMPTY_CONTACT_FORM, firstName: "Sarah" }
    expect(validateContactForm({ ...base, email: "sarah@example" }).email).toBeDefined()
    expect(validateContactForm({ ...base, email: "   " })).toEqual({})
    expect(hasFormErrors(validateContactForm({ ...base, email: "sarah@example.com" }))).toBe(false)
  })

  it("trims fields and turns blanks into null in the payload", () => {
    expect(
      toContactPayload({
        kind: "individual",
        firstName: " Sarah ",
        lastName: "",
        organizationName: "  ",
        email: " sarah@example.com ",
        phone: "555",
      }),
    ).toEqual({
      kind: "individual",
      firstName: "Sarah",
      lastName: null,
      organizationName: null,
      email: "sarah@example.com",
      phone: "555",
    })
  })

  it("maps a stored contact into form values, replacing nulls with empty strings", () => {
    const contact = {
      kind: "organization",
      firstName: null,
      lastName: null,
      organizationName: "Riverside AV",
      email: null,
      phone: "555",
    } as Contact

    expect(contactToFormValues(contact)).toEqual({
      kind: "organization",
      firstName: "",
      lastName: "",
      organizationName: "Riverside AV",
      email: "",
      phone: "555",
    })
  })
})
