import { describe, expect, it } from "vitest"
import { buildGmailComposeUrl } from "./gmailUrlConstructors"

describe("gmailCompose utils", () => {
  it("builds compose URL with to and subject params", () => {
    const url = new URL(buildGmailComposeUrl("client@example.com", "Attn, Smith Wedding Reception"))

    expect(url.origin).toBe("https://mail.google.com")
    expect(url.pathname).toBe("/mail/u/0/")
    expect(url.searchParams.get("view")).toBe("cm")
    expect(url.searchParams.get("fs")).toBe("1")
    expect(url.searchParams.get("to")).toBe("client@example.com")
    expect(url.searchParams.get("su")).toBe("Attn, Smith Wedding Reception")
  })

  it("trims recipient and subject", () => {
    const url = new URL(buildGmailComposeUrl("  client@example.com  ", "  Attn, Event Title  "))

    expect(url.searchParams.get("to")).toBe("client@example.com")
    expect(url.searchParams.get("su")).toBe("Attn, Event Title")
  })

  it("throws when recipient is empty", () => {
    expect(() => buildGmailComposeUrl("   ", "Attn, Event Title")).toThrow("Recipient email is required")
  })

  it("throws when subject is empty", () => {
    expect(() => buildGmailComposeUrl("client@example.com", "   ")).toThrow("Subject is required")
  })
})
