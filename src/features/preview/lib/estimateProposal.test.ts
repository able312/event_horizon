import { describe, expect, it } from "vitest"

import {
  computeDepositRange,
  formatDeposit,
  formatProposalDate,
  nextEventTerms,
  resolveEstimateTerms,
  usesVenueDefaultTerms,
} from "./estimateProposal"

const total = { lowCents: 400_000, highCents: 500_000 }

describe("resolveEstimateTerms", () => {
  it("uses the venue default when the event has no terms of its own", () => {
    expect(resolveEstimateTerms({ terms: null }, "Venue terms")).toBe("Venue terms")
    expect(resolveEstimateTerms(undefined, " Venue terms ")).toBe("Venue terms")
    expect(usesVenueDefaultTerms({ terms: null })).toBe(true)
  })

  it("uses the event's own terms, even when cleared", () => {
    expect(resolveEstimateTerms({ terms: "Event terms" }, "Venue terms")).toBe("Event terms")
    expect(resolveEstimateTerms({ terms: "" }, "Venue terms")).toBe("")
    expect(usesVenueDefaultTerms({ terms: "" })).toBe(false)
  })

  it("is empty when neither is set", () => {
    expect(resolveEstimateTerms(null, null)).toBe("")
  })
})

describe("computeDepositRange", () => {
  it("is null with no deposit", () => {
    expect(computeDepositRange(null, total)).toBeNull()
    expect(computeDepositRange({ depositKind: "none", depositAmountCents: 50_000, depositPercent: 25 }, total)).toBeNull()
  })

  it("uses a fixed amount as is", () => {
    expect(computeDepositRange({ depositKind: "amount", depositAmountCents: 50_000, depositPercent: null }, total))
      .toEqual({ lowCents: 50_000, highCents: 50_000 })
  })

  it("follows the grand total range for a percentage", () => {
    expect(computeDepositRange({ depositKind: "percent", depositAmountCents: null, depositPercent: 25 }, total))
      .toEqual({ lowCents: 100_000, highCents: 125_000 })
  })

  it("is null when the amount or percentage is missing or zero", () => {
    expect(computeDepositRange({ depositKind: "amount", depositAmountCents: null, depositPercent: null }, total)).toBeNull()
    expect(computeDepositRange({ depositKind: "percent", depositAmountCents: null, depositPercent: 0 }, total)).toBeNull()
  })
})

describe("formatDeposit", () => {
  it("names the percentage", () => {
    expect(formatDeposit({ depositKind: "percent", depositAmountCents: null, depositPercent: 25 }, total))
      .toBe("25% of the grand total: $1,000.00 – $1,250.00")
  })

  it("prints a fixed amount", () => {
    expect(formatDeposit({ depositKind: "amount", depositAmountCents: 50_000, depositPercent: null }, total)).toBe("$500.00")
  })
})

describe("formatProposalDate", () => {
  it("prints the stored day without shifting it by time zone", () => {
    expect(formatProposalDate("2026-12-01")).toBe("Dec 1, 2026")
  })

  it("is null when blank or invalid", () => {
    expect(formatProposalDate(null)).toBeNull()
    expect(formatProposalDate("")).toBeNull()
    expect(formatProposalDate("2026-02-31")).toBeNull()
  })
})

describe("nextEventTerms", () => {
  it("keeps following the venue default until the text differs from it", () => {
    expect(nextEventTerms("Venue terms", null, "Venue terms")).toBeUndefined()
    expect(nextEventTerms("Venue terms, plus parking", null, "Venue terms")).toBe("Venue terms, plus parking")
  })

  it("saves the event's own terms only when they change", () => {
    expect(nextEventTerms("Event terms", "Event terms", "Venue terms")).toBeUndefined()
    expect(nextEventTerms("", "Event terms", "Venue terms")).toBe("")
  })
})
