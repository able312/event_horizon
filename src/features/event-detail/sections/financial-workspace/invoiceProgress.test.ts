import { describe, expect, it } from "vitest"

import { computePaidFraction, getDepositStatus } from "./invoiceProgress"

const noDeposit = { depositKind: "none", depositAmountCents: null, depositPercent: null, depositDueDate: null } as const

describe("computePaidFraction", () => {
  it("is the share of the total paid, capped between 0 and 1", () => {
    expect(computePaidFraction(2500, 10000)).toBe(0.25)
    expect(computePaidFraction(12000, 10000)).toBe(1)
    expect(computePaidFraction(-100, 10000)).toBe(0)
  })

  it("treats a zero total as unpaid until something is paid", () => {
    expect(computePaidFraction(0, 0)).toBe(0)
    expect(computePaidFraction(100, 0)).toBe(1)
  })
})

describe("getDepositStatus", () => {
  it("has no status without a deposit", () => {
    expect(getDepositStatus(null, 10000, 0, "2026-11-08")).toEqual({ kind: "none" })
    expect(getDepositStatus(noDeposit, 10000, 0, "2026-11-08")).toEqual({ kind: "none" })
  })

  it("takes a percentage deposit of the invoice total and marks it received once covered", () => {
    const details = { ...noDeposit, depositKind: "percent" as const, depositPercent: 25 }
    expect(getDepositStatus(details, 10000, 2500, "2026-11-08")).toEqual({ kind: "received", depositCents: 2500 })
  })

  it("reports what is still owed, and overdue only after the due date", () => {
    const details = { ...noDeposit, depositKind: "amount" as const, depositAmountCents: 5000, depositDueDate: "2026-11-08" }
    expect(getDepositStatus(details, 20000, 1000, "2026-11-08")).toEqual({
      kind: "due",
      depositCents: 5000,
      outstandingCents: 4000,
      dueDate: "2026-11-08",
    })
    expect(getDepositStatus(details, 20000, 1000, "2026-11-09").kind).toBe("overdue")
  })
})
