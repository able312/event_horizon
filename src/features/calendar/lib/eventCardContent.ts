import type { Event } from "~/definitions/database"

type GuestCountFields = Pick<Event, "minGuests" | "maxGuests" | "guestCountFinal">

export type GuestCountRange = {
  min: number
  max: number
}

const toKnownCount = (value: number | null | undefined): number | null => {
  return typeof value === "number" && value > 0 ? value : null
}

/**
 * Resolves the guest count shown on calendar cards. Final counts use the max field.
 * Missing or zero counts are treated as unknown so the card can hide them.
 */
export function getGuestCountRange(event: GuestCountFields): GuestCountRange | null {
  const min = toKnownCount(event.minGuests)
  const max = toKnownCount(event.maxGuests)

  if (event.guestCountFinal) {
    const finalCount = max ?? min
    return finalCount === null ? null : { min: finalCount, max: finalCount }
  }

  const knownCounts = [min, max].filter((count): count is number => count !== null)
  if (knownCounts.length === 0) return null
  return { min: Math.min(...knownCounts), max: Math.max(...knownCounts) }
}

/** "40" or "20–30" (en dash, no spaces). */
export function formatGuestCount(range: GuestCountRange): string {
  return range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`
}

/** "40 guests" or "20 to 30 guests", for screen readers. */
export function describeGuestCount(range: GuestCountRange): string {
  if (range.min === range.max) {
    return `${range.min} ${range.min === 1 ? "guest" : "guests"}`
  }
  return `${range.min} to ${range.max} guests`
}

type AccessibleNameParts = {
  statusLabel: string
  title: string
  clientName?: string | null
  guestCount?: GuestCountRange | null
  notUploadedToGoogleCalendar?: boolean
}

/** Reads as: status, title, client, guest count. e.g. "New lead: Henderson–Park Wedding, Maya Henderson, 120 to 150 guests" */
export function buildEventCardAccessibleName({
  statusLabel,
  title,
  clientName,
  guestCount,
  notUploadedToGoogleCalendar = false,
}: AccessibleNameParts): string {
  const details = [
    title,
    clientName?.trim() || null,
    guestCount ? describeGuestCount(guestCount) : null,
    notUploadedToGoogleCalendar ? "not uploaded to Google Calendar" : null,
  ].filter((part): part is string => Boolean(part))

  return `${statusLabel}: ${details.join(", ")}`
}
