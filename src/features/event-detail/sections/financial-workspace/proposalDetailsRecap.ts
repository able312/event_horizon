import type { EstimateDetails } from "~/definitions/database"
import { formatCurrencyRange } from "~/features/preview/lib/foodPackages"
import { formatProposalDate, usesVenueDefaultTerms } from "~/features/preview/lib/estimateProposal"

type ProposalDetails = Pick<
  EstimateDetails,
  "introNote" | "validUntil" | "terms" | "depositKind" | "depositAmountCents" | "depositPercent" | "depositDueDate"
>

/** Whether nothing has been set for this event yet; such a card starts open so it gets filled in. */
export function isProposalDetailsEmpty(details: ProposalDetails): boolean {
  return (
    !details.introNote?.trim() &&
    !details.validUntil &&
    details.depositKind === "none" &&
    usesVenueDefaultTerms(details)
  )
}

function describeDeposit(details: ProposalDetails): string {
  if (details.depositKind === "none") return "No deposit"
  let deposit: string | null = null
  if (details.depositKind === "amount" && (details.depositAmountCents ?? 0) > 0) {
    deposit = `${formatCurrencyRange(details.depositAmountCents ?? 0, details.depositAmountCents ?? 0)} deposit`
  }
  if (details.depositKind === "percent" && (details.depositPercent ?? 0) > 0) {
    deposit = `${details.depositPercent}% deposit`
  }
  if (!deposit) return "Deposit amount not set"
  const due = formatProposalDate(details.depositDueDate)
  return due ? `${deposit} due ${due}` : deposit
}

function describeTerms(details: ProposalDetails, venueDefaultTerms: string | null | undefined): string {
  if (usesVenueDefaultTerms(details)) return venueDefaultTerms?.trim() ? "Venue default terms" : "No terms"
  return details.terms?.trim() ? "Custom terms" : "No terms"
}

/** One-line recap shown on the collapsed card, e.g. "Valid until Dec 1, 2026 · 25% deposit due Nov 20, 2026 · Venue default terms". */
export function formatProposalDetailsRecap(
  details: ProposalDetails,
  venueDefaultTerms: string | null | undefined,
): string {
  const validUntil = formatProposalDate(details.validUntil)
  return [
    validUntil ? `Valid until ${validUntil}` : "No valid-until date",
    describeDeposit(details),
    describeTerms(details, venueDefaultTerms),
  ].join(" · ")
}
