import { describe, expect, it } from "vitest"

import { formatProposalDetailsRecap, isProposalDetailsEmpty } from "./proposalDetailsRecap"

const blank = {
  introNote: null,
  validUntil: null,
  terms: null,
  depositKind: "none" as const,
  depositAmountCents: null,
  depositPercent: null,
  depositDueDate: null,
}

describe("isProposalDetailsEmpty", () => {
  it("is empty when nothing has been set for the event", () => {
    expect(isProposalDetailsEmpty(blank)).toBe(true)
    expect(isProposalDetailsEmpty({ ...blank, introNote: "   " })).toBe(true)
  })

  it("is not empty once any field is set", () => {
    expect(isProposalDetailsEmpty({ ...blank, introNote: "Thanks!" })).toBe(false)
    expect(isProposalDetailsEmpty({ ...blank, validUntil: "2026-12-01" })).toBe(false)
    expect(isProposalDetailsEmpty({ ...blank, depositKind: "percent" })).toBe(false)
    expect(isProposalDetailsEmpty({ ...blank, terms: "" })).toBe(false)
  })
})

describe("formatProposalDetailsRecap", () => {
  it("summarises a blank event", () => {
    expect(formatProposalDetailsRecap(blank, "Venue terms")).toBe("No valid-until date · No deposit · Venue default terms")
    expect(formatProposalDetailsRecap(blank, null)).toBe("No valid-until date · No deposit · No terms")
  })

  it("names the valid-until date, deposit and due date", () => {
    expect(
      formatProposalDetailsRecap(
        { ...blank, validUntil: "2026-12-01", depositKind: "percent", depositPercent: 25, depositDueDate: "2026-11-20" },
        "Venue terms",
      ),
    ).toBe("Valid until Dec 1, 2026 · 25% deposit due Nov 20, 2026 · Venue default terms")
  })

  it("prints a fixed deposit amount", () => {
    expect(formatProposalDetailsRecap({ ...blank, depositKind: "amount", depositAmountCents: 50_000 }, null))
      .toBe("No valid-until date · $500.00 deposit · No terms")
  })

  it("flags a deposit with no amount", () => {
    expect(formatProposalDetailsRecap({ ...blank, depositKind: "percent", depositPercent: null }, null))
      .toContain("Deposit amount not set")
  })

  it("distinguishes the event's own terms from cleared terms", () => {
    expect(formatProposalDetailsRecap({ ...blank, terms: "Our terms" }, "Venue terms")).toContain("Custom terms")
    expect(formatProposalDetailsRecap({ ...blank, terms: "" }, "Venue terms")).toContain("No terms")
  })
})
