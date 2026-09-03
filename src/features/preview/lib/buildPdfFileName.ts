import type { PreviewTypeId } from "~/features/preview/lib/previewTypes"

const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g

export type PdfDocumentType = "BEO" | "Timeline" | "Estimate"

export type BuildPdfFileNameInput = {
  clientName: string | null | undefined
  startDateTime: string | null | undefined
  previewType: PreviewTypeId
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

export function getPdfDocumentType(previewType: PreviewTypeId): PdfDocumentType {
  switch (previewType) {
    case "timeline":
      return "Timeline"
    case "financial-report":
      return "Estimate"
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
  now = new Date(),
}: BuildPdfFileNameInput): string {
  const created = formatPdfDate(now)
  const lastName = sanitizeFileNameSegment(extractClientLastName(clientName))
  const docType = getPdfDocumentType(previewType)
  const eventDate = formatEventDateFromIso(startDateTime)

  return `${created}_${lastName}_${docType}_${eventDate}.pdf`
}
