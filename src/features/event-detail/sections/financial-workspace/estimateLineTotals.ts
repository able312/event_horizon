import type { BeverageItem, PricingBasis } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
import {
  computeEstimateLineTotalCents,
  computeFoodTimeblockSubtotalCents,
  type GuestCountRange,
} from "~/features/event-detail/workspace/lib/financial"

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

/**
 * What the estimate counts from planning: food timeblocks (with any package price) and beverage
 * items, across the guest count, leaving optional add-ons out.
 */
export function sumEstimatePlanning(
  foodTimeblocks: TimeblockWithItems[],
  beverageItems: BeverageItem[],
  guests: GuestCountRange | null,
): { food: CentsRange; beverage: CentsRange } {
  const counted = splitEstimateAddOns(foodTimeblocks, beverageItems)
  const foodAt = (guestCount: number | null) =>
    counted.foodTimeblocks.reduce((sum, timeblock) => sum + computeFoodTimeblockSubtotalCents(timeblock, guestCount), 0)
  return {
    food: { lowCents: foodAt(guests?.min ?? null), highCents: foodAt(guests?.max ?? null) },
    beverage: sumEstimateBillingItems(counted.beverageItems, guests),
  }
}
