import {
  DEFAULT_FINANCIAL_DOCUMENT_KIND,
  getFinancialDocumentKindLabels,
  type FinancialDocumentKind,
} from "~/features/preview/lib/financialDocumentKinds"
import type { PreviewTypeId } from "~/features/preview/lib/previewTypes"

const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g

export type PdfDocumentType = "BEO" | "Timeline" | "Estimate" | "Invoice" | "Cart_Setup"

export type BuildPdfFileNameInput = {
  clientName: string | null | undefined
  startDateTime: string | null | undefined
  previewType: PreviewTypeId
  /** Which title the financial report carries; ignored for other preview types. */
  financialDocumentKind?: FinancialDocumentKind
  now?: Date
}

export function formatPdfDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()

  return `${month}.${day}.${year}`
}

export function extractClientLastName(clientName: string | null | undefined): string {
  const trimmed = clientName?.trim()
  if (!trimmed) return "Client"

  const parts = trimmed.split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] ?? "Client"
}

export function getPdfDocumentType(
  previewType: PreviewTypeId,
  financialDocumentKind: FinancialDocumentKind = DEFAULT_FINANCIAL_DOCUMENT_KIND,
): PdfDocumentType {
  switch (previewType) {
    case "timeline":
      return "Timeline"
    case "financial-report":
      return getFinancialDocumentKindLabels(financialDocumentKind).fileLabel
    case "cart-diagram":
      return "Cart_Setup"
    case "beo":
    case "beo-food":
    default:
      return "BEO"
  }
}

export function sanitizeFileNameSegment(value: string): string {
  const sanitized = value.replace(UNSAFE_FILENAME_CHARS, "").trim()
  return sanitized || "Unknown"
}

function formatEventDateFromIso(startDateTime: string | null | undefined): string {
  if (!startDateTime) return "Undated"

  const date = new Date(startDateTime)
  if (Number.isNaN(date.getTime())) return "Undated"

  return formatPdfDate(date)
}

export function buildPdfFileName({
  clientName,
  startDateTime,
  previewType,
  financialDocumentKind,
  now = new Date(),
}: BuildPdfFileNameInput): string {
  const created = formatPdfDate(now)
  const lastName = sanitizeFileNameSegment(extractClientLastName(clientName))
  const docType = getPdfDocumentType(previewType, financialDocumentKind)
  const eventDate = formatEventDateFromIso(startDateTime)

  return `${created}_${lastName}_${docType}_${eventDate}.pdf`
}
