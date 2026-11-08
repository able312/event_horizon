import type { DepositKind, EstimateDetails, UpdateEstimateDetails } from "~/definitions/database"
import { centsToDollars, parseDollarsToCents } from "~/features/event-detail/workspace/lib/financial"
import { usesVenueDefaultTerms } from "~/features/preview/lib/estimateProposal"

/**
 * Where the event's terms come from once the dialog is saved:
 * - "venue-default": the venue default (the box shows it; editing it makes this event's own terms)
 * - "event": this event's own terms
 * - "new-venue-default": the box becomes the new venue default, and the event follows it
 */
export type ProposalTermsMode = "venue-default" | "event" | "new-venue-default"

/** The Proposal Details form while it is open. Text fields hold what is typed; nothing is saved until Save. */
export interface ProposalDetailsDraft {
  introNote: string
  /** YYYY-MM-DD, or "" for none */
  validUntil: string
  depositKind: DepositKind
  /** Dollars as typed, e.g. "500.00" */
  depositAmount: string
  depositPercent: string
  /** YYYY-MM-DD, or "" for none */
  depositDueDate: string
  depositNote: string
  terms: string
  termsMode: ProposalTermsMode
}

type DraftSource = Omit<EstimateDetails, "id" | "eventId" | "createdAt" | "updatedAt">

/** The draft the dialog opens with: the saved details, with the venue default shown when the event follows it. */
export function createProposalDetailsDraft(
  details: DraftSource,
  venueDefaultTerms: string | null | undefined,
): ProposalDetailsDraft {
  const followsDefault = usesVenueDefaultTerms(details)
  return {
    introNote: details.introNote ?? "",
    validUntil: details.validUntil ?? "",
    depositKind: details.depositKind,
    depositAmount: details.depositAmountCents == null ? "" : centsToDollars(details.depositAmountCents).toFixed(2),
    depositPercent: details.depositPercent == null ? "" : String(details.depositPercent),
    depositDueDate: details.depositDueDate ?? "",
    depositNote: details.depositNote ?? "",
    terms: followsDefault ? venueDefaultTerms ?? "" : details.terms ?? "",
    termsMode: followsDefault ? "venue-default" : "event",
  }
}

/** Empty text is stored as null so a cleared field prints nothing. */
function textOrNull(value: string): string | null {
  return value.trim() ? value : null
}

/** Typed dollars as cents; text that is not a number keeps the saved amount rather than storing $0. */
function parseDepositAmount(value: string, savedCents: number | null): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseDollarsToCents(trimmed)
  return parsed == null ? savedCents : Math.max(0, parsed)
}

/** A typed percentage clamped to 0–100; blank or not a number clears it. */
function parseDepositPercent(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null
}

/** The deposit the draft describes, for the live "Deposit on the current totals" line. */
export function draftDepositSettings(
  draft: ProposalDetailsDraft,
  saved: Pick<EstimateDetails, "depositAmountCents">,
): Pick<EstimateDetails, "depositKind" | "depositAmountCents" | "depositPercent"> {
  return {
    depositKind: draft.depositKind,
    depositAmountCents: parseDepositAmount(draft.depositAmount, saved.depositAmountCents),
    depositPercent: parseDepositPercent(draft.depositPercent),
  }
}

/** Whether the terms box will print the venue default once saved (unedited default text keeps following it). */
export function draftFollowsVenueDefault(
  draft: Pick<ProposalDetailsDraft, "terms" | "termsMode">,
  venueDefaultTerms: string | null | undefined,
): boolean {
  if (draft.termsMode === "new-venue-default") return true
  if (draft.termsMode === "event") return false
  return draft.terms.trim() === (venueDefaultTerms ?? "").trim()
}

export interface ProposalDetailsSave {
  /** Only the fields that changed, so a teammate's edit to another field is kept. Empty when nothing changed. */
  updates: UpdateEstimateDetails
  /** The new venue default terms, or undefined to leave the venue default alone. */
  venueDefaultTerms: string | null | undefined
}

/** What Save writes: the changed event fields, and the venue default terms when the user chose to replace them. */
export function resolveProposalDetailsSave(
  draft: ProposalDetailsDraft,
  saved: DraftSource,
  venueDefaultTerms: string | null | undefined,
): ProposalDetailsSave {
  const deposit = draftDepositSettings(draft, saved)
  const next: Required<UpdateEstimateDetails> = {
    introNote: textOrNull(draft.introNote),
    validUntil: draft.validUntil || null,
    depositKind: deposit.depositKind,
    depositAmountCents: deposit.depositAmountCents,
    depositPercent: deposit.depositPercent,
    depositDueDate: draft.depositDueDate || null,
    depositNote: textOrNull(draft.depositNote),
    terms: draftFollowsVenueDefault(draft, venueDefaultTerms) ? null : draft.terms,
  }

  const updates: UpdateEstimateDetails = {}
  for (const key of Object.keys(next) as Array<keyof typeof next>) {
    if (next[key] !== saved[key]) Object.assign(updates, { [key]: next[key] })
  }

  return {
    updates,
    venueDefaultTerms: draft.termsMode === "new-venue-default" ? textOrNull(draft.terms) : undefined,
  }
}
