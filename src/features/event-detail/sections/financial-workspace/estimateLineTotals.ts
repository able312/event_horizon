import type { PricingBasis } from "~/definitions/database"
import { computeEstimateLineTotalCents, type GuestCountRange } from "~/features/event-detail/workspace/lib/financial"

export type CentsRange = { lowCents: number; highCents: number }

type EstimateLineItem = {
  quantity: number | null
  unitPriceCents: number | null
  pricingBasis?: PricingBasis | null
}

/**
 * A food or beverage line's estimate total across the guest count: low at the fewest guests,
 * high at the most. Null when a per-person line has no guest count to price against.
 */
export function computeEstimateLineTotal(item: EstimateLineItem, guests: GuestCountRange | null): CentsRange | null {
  const lowCents = computeEstimateLineTotalCents(item, guests?.min ?? null)
  const highCents = computeEstimateLineTotalCents(item, guests?.max ?? null)
  return lowCents == null || highCents == null ? null : { lowCents, highCents }
}

/** Adds line totals, leaving out lines that could not be priced. */
export function sumEstimateLineTotals(totals: Array<CentsRange | null>): CentsRange {
  return totals.reduce<CentsRange>(
    (sum, total) => (total
      ? { lowCents: sum.lowCents + total.lowCents, highCents: sum.highCents + total.highCents }
      : sum),
    { lowCents: 0, highCents: 0 },
  )
}

/** Food and beverage lines on the estimate, priced against the guest count where they are per person. */
export function sumEstimateBillingItems(items: EstimateLineItem[], guests: GuestCountRange | null): CentsRange {
  return sumEstimateLineTotals(items.map((item) => computeEstimateLineTotal(item, guests)))
}
