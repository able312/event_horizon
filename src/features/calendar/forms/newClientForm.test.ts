import { describe, expect, it } from "vitest"

import { EMPTY_NEW_CLIENT, isNewClientBlank, toNewClientContact, validateNewClient } from "./newClientForm"

describe("new client form", () => {
  it("treats a blank or whitespace-only section as no client", () => {
    const blank = { name: " ", email: "", phone: "  " }

    expect(isNewClientBlank(EMPTY_NEW_CLIENT)).toBe(true)
    expect(isNewClientBlank(blank)).toBe(true)
    expect(validateNewClient(blank)).toEqual({})
    expect(toNewClientContact(blank)).toBeNull()
  })

  it("requires a name once any client detail is entered, and a valid email", () => {
    expect(validateNewClient({ name: "", email: "", phone: "555" })).toEqual({
      name: "A first or last name is required",
    })
    expect(validateNewClient({ name: "Jane", email: "jane@", phone: "" })).toEqual({
      email: "Enter a valid email address",
    })
    expect(validateNewClient({ name: "Jane", email: "jane@example.com", phone: "" })).toEqual({})
  })

  it("splits the name into first and last name and trims every field", () => {
    expect(toNewClientContact({ name: "  Mary Ann  Smith ", email: " mary@example.com ", phone: "" })).toEqual({
      kind: "individual",
      firstName: "Mary",
      lastName: "Ann Smith",
      organizationName: null,
      email: "mary@example.com",
      phone: null,
    })
    expect(toNewClientContact({ name: "Cher", email: "", phone: "555" })).toMatchObject({
      firstName: "Cher",
      lastName: null,
      phone: "555",
    })
  })
})
