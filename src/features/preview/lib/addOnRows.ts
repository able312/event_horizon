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
}

/** The printed price and total of an optional add-on (before HST and gratuity). */
export function formatAddOnCells(addOn: EstimateAddOn, guests: GuestCountRange | null): AddOnCells {
  const perPerson = addOn.perPersonRateCents > 0 ? `${toCurrency(addOn.perPersonRateCents)} per person` : null
  const fixed = addOn.fixedCents > 0 ? toCurrency(addOn.fixedCents) : null
  const price = [perPerson, fixed].filter(Boolean).join(" + ")
  if (!price) return { price: "", total: "" }
  if (perPerson && !guests) return { price, total: "per person" }
  const subtotal = computeAddOnSubtotal(addOn, guests)
  return { price, total: formatCurrencyRange(subtotal.lowCents, subtotal.highCents) }
}
