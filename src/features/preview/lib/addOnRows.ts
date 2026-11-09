import {
  computeAddOnSubtotal,
  type EstimateAddOn,
} from "~/features/event-detail/workspace/lib/estimateAddOns"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { formatCurrencyRange, type GuestCountRange } from "~/features/preview/lib/foodPackages"

export type AddOnCells = {
  /** e.g. "$8.00 per person", "$200.00", or "$9.00 per person + $100.00". */
  price: string
  /** The add-on's subtotal across the guest count; "per person" when there is no guest count to price it. */
  total: string
  /**
   * Each guest's share: a per-person price as is, plus any fixed price shared by the guests
   * (a range over the guest count). Blank without a guest count.
   */
  perPerson: string
}

/** The printed price and total of an optional add-on (before HST and gratuity). */
export function formatAddOnCells(addOn: EstimateAddOn, guests: GuestCountRange | null): AddOnCells {
  const perPerson = addOn.perPersonRateCents > 0 ? `${toCurrency(addOn.perPersonRateCents)} per person` : null
  const fixed = addOn.fixedCents > 0 ? toCurrency(addOn.fixedCents) : null
  const price = [perPerson, fixed].filter(Boolean).join(" + ")
  if (!price) return { price: "", total: "", perPerson: "" }
  if (!guests) return { price, total: perPerson ? "per person" : toCurrency(addOn.fixedCents), perPerson: "" }
  const subtotal = computeAddOnSubtotal(addOn, guests)
  return {
    price,
    total: formatCurrencyRange(subtotal.lowCents, subtotal.highCents),
    perPerson: formatCurrencyRange(
      Math.round(addOn.perPersonRateCents + addOn.fixedCents / guests.max),
      Math.round(addOn.perPersonRateCents + addOn.fixedCents / guests.min),
    ),
  }
}
