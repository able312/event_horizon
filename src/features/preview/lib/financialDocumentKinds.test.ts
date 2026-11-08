import { describe, expect, it } from "vitest"

import { getFinancialDocumentKindLabels } from "./financialDocumentKinds"

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
