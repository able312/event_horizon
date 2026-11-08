export type FinancialDocumentKind = "estimate" | "invoice"

export type FinancialDocumentKindLabels = {
  /** Heading printed at the top of the document. */
  title: string
  /** Label for the date the document was generated. */
  dateLabel: string
  /** Document type segment used in the saved PDF file name. */
  fileLabel: "Estimate" | "Invoice"
}

const FINANCIAL_DOCUMENT_KIND_LABELS: Record<FinancialDocumentKind, FinancialDocumentKindLabels> = {
  estimate: { title: "Event Estimate", dateLabel: "Estimate Date", fileLabel: "Estimate" },
  invoice: { title: "Event Invoice", dateLabel: "Invoice Date", fileLabel: "Invoice" },
}

export function getFinancialDocumentKindLabels(
  kind: FinancialDocumentKind,
): FinancialDocumentKindLabels {
  return FINANCIAL_DOCUMENT_KIND_LABELS[kind]
}
