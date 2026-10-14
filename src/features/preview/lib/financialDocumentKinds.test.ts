import { describe, expect, it } from "vitest"

import {
  FINANCIAL_DOCUMENT_KIND_OPTIONS,
  getFinancialDocumentKindLabels,
} from "./financialDocumentKinds"

describe("getFinancialDocumentKindLabels", () => {
  it("labels an estimate", () => {
    expect(getFinancialDocumentKindLabels("estimate")).toEqual({
      title: "Event Estimate",
      dateLabel: "Estimate Date",
      fileLabel: "Estimate",
    })
  })

  it("labels an invoice", () => {
    expect(getFinancialDocumentKindLabels("invoice")).toEqual({
      title: "Event Invoice",
      dateLabel: "Invoice Date",
      fileLabel: "Invoice",
    })
  })
})

describe("FINANCIAL_DOCUMENT_KIND_OPTIONS", () => {
  it("offers every kind by its printed title, estimate first", () => {
    expect(FINANCIAL_DOCUMENT_KIND_OPTIONS).toEqual([
      { kind: "estimate", label: "Event Estimate" },
      { kind: "invoice", label: "Event Invoice" },
    ])
  })
})
