import { describe, expect, it } from "vitest"

import {
  createProposalDetailsDraft,
  draftDepositSettings,
  draftFollowsVenueDefault,
  resolveProposalDetailsSave,
  type ProposalDetailsDraft,
} from "./proposalDetailsDraft"

const saved = {
  introNote: "Thanks!",
  validUntil: "2026-11-22",
  terms: null,
  depositKind: "percent" as const,
  depositAmountCents: null,
  depositPercent: 25,
  depositDueDate: "2026-11-22",
  depositNote: null,
}

function draftFor(overrides: Partial<ProposalDetailsDraft> = {}): ProposalDetailsDraft {
  return { ...createProposalDetailsDraft(saved, "Venue terms"), ...overrides }
}

describe("createProposalDetailsDraft", () => {
  it("shows the venue default terms when the event follows them", () => {
    expect(draftFor()).toEqual({
      introNote: "Thanks!",
      validUntil: "2026-11-22",
      depositKind: "percent",
      depositAmount: "",
      depositPercent: "25",
      depositDueDate: "2026-11-22",
      depositNote: "",
      terms: "Venue terms",
      termsMode: "venue-default",
    })
  })

  it("shows the event's own terms and amount as dollars", () => {
    const draft = createProposalDetailsDraft(
      { ...saved, terms: "", depositKind: "amount", depositAmountCents: 50000 },
      "Venue terms",
    )
    expect(draft.terms).toBe("")
    expect(draft.termsMode).toBe("event")
    expect(draft.depositAmount).toBe("500.00")
  })
})

describe("resolveProposalDetailsSave", () => {
  it("writes nothing when the draft is unchanged", () => {
    expect(resolveProposalDetailsSave(draftFor(), saved, "Venue terms")).toEqual({
      updates: {},
      venueDefaultTerms: undefined,
    })
  })

  it("writes only the changed fields, storing cleared text as null", () => {
    const { updates } = resolveProposalDetailsSave(
      draftFor({ introNote: "  ", depositNote: "Non-refundable", validUntil: "" }),
      saved,
      "Venue terms",
    )
    expect(updates).toEqual({ introNote: null, depositNote: "Non-refundable", validUntil: null })
  })

  it("parses and clamps the deposit", () => {
    expect(resolveProposalDetailsSave(draftFor({ depositPercent: "150" }), saved, null).updates.depositPercent).toBe(100)
    expect(
      resolveProposalDetailsSave(draftFor({ depositKind: "amount", depositAmount: "$1,250.5" }), saved, null).updates,
    ).toMatchObject({ depositKind: "amount", depositAmountCents: 125050 })
  })

  it("keeps the saved amount when the typed amount is not a number", () => {
    const withAmount = { ...saved, depositKind: "amount" as const, depositAmountCents: 50000 }
    const draft = { ...createProposalDetailsDraft(withAmount, null), depositAmount: "abc" }
    expect(resolveProposalDetailsSave(draft, withAmount, null).updates).toEqual({})
  })

  it("makes edited default terms this event's own", () => {
    const { updates, venueDefaultTerms } = resolveProposalDetailsSave(
      draftFor({ terms: "Venue terms, plus a minimum" }),
      saved,
      "Venue terms",
    )
    expect(updates).toEqual({ terms: "Venue terms, plus a minimum" })
    expect(venueDefaultTerms).toBeUndefined()
  })

  it("returns an event to the venue default", () => {
    const own = { ...saved, terms: "Own terms" }
    const draft = { ...createProposalDetailsDraft(own, "Venue terms"), terms: "Venue terms", termsMode: "venue-default" as const }
    expect(resolveProposalDetailsSave(draft, own, "Venue terms").updates).toEqual({ terms: null })
  })

  it("saves the box as the new venue default and has the event follow it", () => {
    const own = { ...saved, terms: "Own terms" }
    const draft = { ...createProposalDetailsDraft(own, "Venue terms"), termsMode: "new-venue-default" as const }
    expect(resolveProposalDetailsSave(draft, own, "Venue terms")).toEqual({
      updates: { terms: null },
      venueDefaultTerms: "Own terms",
    })
  })
})

describe("draftFollowsVenueDefault", () => {
  it("treats untouched default text as following the default", () => {
    expect(draftFollowsVenueDefault({ terms: " Venue terms ", termsMode: "venue-default" }, "Venue terms")).toBe(true)
    expect(draftFollowsVenueDefault({ terms: "Changed", termsMode: "venue-default" }, "Venue terms")).toBe(false)
    expect(draftFollowsVenueDefault({ terms: "Venue terms", termsMode: "event" }, "Venue terms")).toBe(false)
  })
})

describe("draftDepositSettings", () => {
  it("previews the typed deposit", () => {
    expect(draftDepositSettings(draftFor({ depositPercent: "10" }), saved)).toEqual({
      depositKind: "percent",
      depositAmountCents: null,
      depositPercent: 10,
    })
  })
})
