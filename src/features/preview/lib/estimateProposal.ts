import type { EstimateDetails } from "~/definitions/database"
import { formatCurrencyRange } from "~/features/preview/lib/foodPackages"
import { parseLocalDateKey } from "~/lib/months"

type DepositSettings = Pick<EstimateDetails, "depositKind" | "depositAmountCents" | "depositPercent">

export type CentsRange = { lowCents: number; highCents: number }

/**
 * The terms printed on an event's estimate. An event without its own terms (null) uses the
 * venue default; an event whose terms were cleared to "" prints none.
 */
export function resolveEstimateTerms(
  details: Pick<EstimateDetails, "terms"> | null | undefined,
  venueDefaultTerms: string | null | undefined,
): string {
  return (details?.terms ?? venueDefaultTerms ?? "").trim()
}

/** Whether the event prints the venue default terms rather than its own. */
export function usesVenueDefaultTerms(details: Pick<EstimateDetails, "terms"> | null | undefined): boolean {
  return details?.terms == null
}

/**
 * The deposit asked for, or null when there is none. A percentage deposit follows the grand
 * total, so it is a range whenever the total is.
 */
export function computeDepositRange(
  details: DepositSettings | null | undefined,
  grandTotal: CentsRange,
): CentsRange | null {
  if (!details) return null
  if (details.depositKind === "amount") {
    const cents = details.depositAmountCents ?? 0
    return cents > 0 ? { lowCents: cents, highCents: cents } : null
  }
  if (details.depositKind === "percent") {
    const percent = details.depositPercent ?? 0
    if (percent <= 0) return null
    return {
      lowCents: Math.round((grandTotal.lowCents * percent) / 100),
      highCents: Math.round((grandTotal.highCents * percent) / 100),
    }
  }
  return null
}

/** e.g. "$500.00", or "25% of the grand total: $1,000.00 – $1,250.00". Null when there is no deposit. */
export function formatDeposit(
  details: DepositSettings | null | undefined,
  grandTotal: CentsRange,
): string | null {
  const deposit = computeDepositRange(details, grandTotal)
  if (!deposit) return null
  const amount = formatCurrencyRange(deposit.lowCents, deposit.highCents)
  return details?.depositKind === "percent" ? `${details.depositPercent}% of the grand total: ${amount}` : amount
}

/** A stored "YYYY-MM-DD" date as printed, e.g. "Dec 1, 2026"; null when blank or invalid. */
export function formatProposalDate(dateKey: string | null | undefined): string | null {
  const date = parseLocalDateKey(dateKey ?? "")
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null
}

/**
 * What to store as the event's terms after the user edits the terms box, or undefined to
 * leave them alone. While an event follows the venue default, the box shows the default;
 * it only becomes the event's own terms once its text differs from the default.
 */
export function nextEventTerms(
  text: string,
  currentTerms: string | null,
  venueDefaultTerms: string | null | undefined,
): string | null | undefined {
  if (currentTerms == null) return text.trim() === (venueDefaultTerms ?? "").trim() ? undefined : text
  return text === currentTerms ? undefined : text
}
