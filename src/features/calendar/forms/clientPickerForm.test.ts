import { describe, expect, it } from "vitest"

import {
  EMPTY_CLIENT_SELECTION,
  pickClient,
  searchClients,
  startNewClient,
  toClientTarget,
  UNPICKED_CLIENT_ERROR,
  validateClientSelection,
  type ClientSelection,
} from "./clientPickerForm"

function newClient(name: string, email = "", phone = ""): ClientSelection {
  return { mode: "create", query: "", values: { name, email, phone } }
}

describe("client picker form", () => {
  it("treats an empty search as no client", () => {
    expect(validateClientSelection(EMPTY_CLIENT_SELECTION)).toEqual({})
    expect(validateClientSelection(searchClients("   "))).toEqual({})
    expect(toClientTarget(searchClients("  "))).toBeNull()
  })

  it("blocks create while search text is typed but nothing is picked", () => {
    expect(validateClientSelection(searchClients("Jane"))).toEqual({ name: UNPICKED_CLIENT_ERROR })
    expect(toClientTarget(searchClients("Jane"))).toBeNull()
  })

  it("attaches a picked contact by id", () => {
    const selection = pickClient({ id: "contact-1", displayName: "Jane Smith" })

    expect(validateClientSelection(selection)).toEqual({})
    expect(toClientTarget(selection)).toEqual({ contactId: "contact-1" })
  })

  it("pre-fills the email when the search text looks like an email, otherwise the name", () => {
    expect(startNewClient(" jane@example.com ")).toEqual({
      mode: "create",
      query: " jane@example.com ",
      values: { name: "", email: "jane@example.com", phone: "" },
    })
    expect(startNewClient("  Mary  Ann Smith ")).toMatchObject({ values: { name: "Mary Ann Smith", email: "", phone: "" } })
    expect(startNewClient("")).toMatchObject({ values: { name: "", email: "", phone: "" } })
  })

  it("requires a name and a valid email for a new contact", () => {
    expect(validateClientSelection(newClient("", "jane@example.com"))).toEqual({
      name: "A first or last name is required",
    })
    expect(validateClientSelection(newClient("Jane", "jane@"))).toEqual({ email: "Enter a valid email address" })
    expect(validateClientSelection(newClient("Jane", "jane@example.com"))).toEqual({})
  })

  it("splits the new contact's name into first and last name and trims every field", () => {
    expect(toClientTarget(newClient("  Mary Ann  Smith ", " mary@example.com "))).toEqual({
      newContact: {
        kind: "individual",
        firstName: "Mary",
        lastName: "Ann Smith",
        organizationName: null,
        email: "mary@example.com",
        phone: null,
      },
    })
    expect(toClientTarget(newClient("Cher", "", "555"))).toMatchObject({
      newContact: { firstName: "Cher", lastName: null, phone: "555" },
    })
  })
})
