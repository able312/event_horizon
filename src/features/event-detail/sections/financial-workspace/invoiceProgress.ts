import type { EstimateDetails } from "~/definitions/database"
import { computeDepositRange } from "~/features/preview/lib/estimateProposal"

type DepositDetails = Pick<EstimateDetails, "depositKind" | "depositAmountCents" | "depositPercent" | "depositDueDate">

export type DepositStatus =
  | { kind: "none" }
  | { kind: "received"; depositCents: number }
  | { kind: "due" | "overdue"; depositCents: number; outstandingCents: number; dueDate: string | null }

/** Share of the grand total paid so far, from 0 to 1. Nothing owed counts as fully paid once anything is paid. */
export function computePaidFraction(paidCents: number, grandTotalCents: number): number {
  if (grandTotalCents <= 0) return paidCents > 0 ? 1 : 0
  return Math.min(1, Math.max(0, paidCents / grandTotalCents))
}

/**
 * Whether the deposit set in the proposal details has been covered by payments so far.
 * A percentage deposit is taken of the invoice grand total. `todayKey` is today's local
 * "YYYY-MM-DD"; a deposit not yet covered after its due date is overdue.
 */
export function getDepositStatus(
  details: DepositDetails | null | undefined,
  grandTotalCents: number,
  paidCents: number,
  todayKey: string,
): DepositStatus {
  const deposit = computeDepositRange(details, { lowCents: grandTotalCents, highCents: grandTotalCents })
  if (!details || !deposit) return { kind: "none" }

  const depositCents = deposit.lowCents
  if (paidCents >= depositCents) return { kind: "received", depositCents }

  const dueDate = details.depositDueDate ?? null
  return {
    kind: dueDate && dueDate < todayKey ? "overdue" : "due",
    depositCents,
    outstandingCents: depositCents - paidCents,
    dueDate,
  }
}
