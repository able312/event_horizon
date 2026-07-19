import { describe, expect, it } from "vitest"

import formatClientDetailsPlainText from "./formatClientDetailsPlainText"

describe("formatClientDetailsPlainText", () => {
  it("returns null when name or event title is missing", () => {
    expect(
      formatClientDetailsPlainText({
        name: "",
        email: "jane@example.com",
        phone: "555-1234",
        eventTitle: "Smith Wedding",
      }),
    ).toBeNull()

    expect(
      formatClientDetailsPlainText({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-1234",
        eventTitle: "",
      }),
    ).toBeNull()
  })

  it("formats client details and omits empty email/phone lines", () => {
    expect(
      formatClientDetailsPlainText({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "",
        eventTitle: "Smith Wedding",
      }),
    ).toBe(
      ["Smith Wedding Main Contact", "Name: Jane Smith", "Email: jane@example.com"].join(
        "\n",
      ),
    )
  })
})
