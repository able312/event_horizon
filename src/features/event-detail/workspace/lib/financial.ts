import type { MenuOfChargeItem, Payment, BeverageItem, PricingBasis } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

export const HST_RATE = 0.13
export const GRATUITY_RATE = 0.18

/** An item's pricing basis; records saved before the field existed are priced "each". */
export function getPricingBasis(item: { pricingBasis?: PricingBasis | null }): PricingBasis {
  return item.pricingBasis ?? "each"
}

export function centsToDollars(cents: number | null | undefined): number {
  return (cents ?? 0) / 100
}

export function dollarsToCents(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0

  const asNumber = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(asNumber)) return 0

  return Math.round(asNumber * 100)
}

/** Quantity × unit price for any priced line (charge, food or beverage item); missing values count as 0. */
export function computeBillableLineTotalCents(item: {
  quantity?: number | null
  unitPriceCents?: number | null
}): number {
  return (item.quantity ?? 0) * (item.unitPriceCents ?? 0)
}

export function computeMenuSubtotalCents(items: MenuOfChargeItem[] | undefined): number {
  if (!items || items.length === 0) return 0

  return items.reduce((sum, item) => sum + computeBillableLineTotalCents(item), 0)
}

export function computePaymentsTotalCents(payments: Payment[] | undefined): number {
  if (!payments || payments.length === 0) return 0

  return payments.reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0)
}

export type GuestCountRange = {
  /** Fewest guests; per-person prices are highest here. */
  min: number
  /** Most guests; per-person prices are lowest here. */
  max: number
}

type PricedFoodOrBeverageItem = {
  quantity?: number | null
  unitPriceCents?: number | null
  pricingBasis?: PricingBasis | null
}

/**
 * A food or beverage line's total on an estimate. "each" lines are quantity × price; "per_person"
 * lines are price × guestCount, ignoring quantity, and null (unpriceable) without a guest count.
 */
export function computeEstimateLineTotalCents(
  item: PricedFoodOrBeverageItem,
  guestCount: number | null,
): number | null {
  if (getPricingBasis(item) === "each") return computeBillableLineTotalCents(item)
  return guestCount == null ? null : (item.unitPriceCents ?? 0) * guestCount
}

/** Undefined guest count: quantity × price for every line (invoice). Otherwise the estimate rule. */
function computeFoodOrBeverageLineCents(
  item: PricedFoodOrBeverageItem,
  perPersonGuestCount: number | null | undefined,
): number {
  if (perPersonGuestCount === undefined) return computeBillableLineTotalCents(item)
  return computeEstimateLineTotalCents(item, perPersonGuestCount) ?? 0
}

function computeFoodSubtotalCents(
  foodTimeblocks: TimeblockWithItems[] | undefined,
  perPersonGuestCount: number | null | undefined,
): number {
  if (!foodTimeblocks || foodTimeblocks.length === 0) return 0

  return foodTimeblocks.reduce((sum, timeblock) => (
    sum + (timeblock.foodItems ?? []).reduce(
      (itemSum, item) => itemSum + computeFoodOrBeverageLineCents(item, perPersonGuestCount),
      0,
    )
  ), 0)
}

function computeBeverageSubtotalCents(
  beverageItems: BeverageItem[] | undefined,
  perPersonGuestCount: number | null | undefined,
): number {
  if (!beverageItems || beverageItems.length === 0) return 0

  return beverageItems.reduce((sum, item) => sum + computeFoodOrBeverageLineCents(item, perPersonGuestCount), 0)
}

function computeGratuityBaseCents(foodSubtotalCents: number, beverageSubtotalCents: number): number {
  return foodSubtotalCents + beverageSubtotalCents
}

function computeGratuityCents(gratuityBaseCents: number): number {
  return Math.round(gratuityBaseCents * GRATUITY_RATE)
}

export type FinancialSummary = ReturnType<typeof computeFinancialSummaryAllSources>

export function computeFinancialSummaryAllSources(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  /** Left out for an estimate, which has nothing paid against it. */
  payments?: Payment[]
  /** Food charged on top of the timeblocks' items, e.g. a food package figure (see preview/lib/foodPackages). */
  additionalFoodSubtotalCents?: number
  /**
   * Estimate only. When given, "per_person" food and beverage lines are price × this count
   * (left out when null). When omitted, every line is quantity × price, as on the invoice.
   */
  perPersonGuestCount?: number | null
}) {
  const menuSubtotalCents = computeMenuSubtotalCents(params.menuItems)
  const foodSubtotalCents =
    computeFoodSubtotalCents(params.foodTimeblocks, params.perPersonGuestCount) +
    (params.additionalFoodSubtotalCents ?? 0)
  const beverageSubtotalCents = computeBeverageSubtotalCents(params.beverageItems, params.perPersonGuestCount)
  const chargesSubtotalCents = menuSubtotalCents + foodSubtotalCents + beverageSubtotalCents
  const gratuityBaseCents = computeGratuityBaseCents(foodSubtotalCents, beverageSubtotalCents)
  const gratuityCents = computeGratuityCents(gratuityBaseCents)
  const hstCents = Math.round(chargesSubtotalCents * HST_RATE)
  const chargesTotalCents = chargesSubtotalCents + hstCents
  const grandTotalCents = chargesTotalCents + gratuityCents
  const paidTotalCents = computePaymentsTotalCents(params.payments)
  const balanceDueCents = grandTotalCents - paidTotalCents

  return {
    menuSubtotalCents,
    foodSubtotalCents,
    beverageSubtotalCents,
    chargesSubtotalCents,
    gratuityBaseCents,
    gratuityCents,
    hstCents,
    chargesTotalCents,
    grandTotalCents,
    paidTotalCents,
    balanceDueCents,
  }
}

export type EstimateSummaryRange = {
  /** At the fewest guests (or the only figure). */
  low: FinancialSummary
  /** At the most guests; equals low when nothing is priced per person or the count is fixed. */
  high: FinancialSummary
}

/**
 * The estimate's totals as a range over the guest count: low at guests.min, high at guests.max.
 * Without a guest count, per-person lines are left out of both. No payments (an estimate has none).
 */
export function computeEstimateSummaryRange(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  guests: GuestCountRange | null
  /** Extra food at each end, e.g. a food package figure (see preview/lib/foodPackages). */
  additionalFoodSubtotalCents?: { low: number; high: number }
}): EstimateSummaryRange {
  const summaryAt = (guestCount: number | null, additionalFoodSubtotalCents: number | undefined) =>
    computeFinancialSummaryAllSources({
      menuItems: params.menuItems,
      foodTimeblocks: params.foodTimeblocks,
      beverageItems: params.beverageItems,
      additionalFoodSubtotalCents,
      perPersonGuestCount: guestCount,
    })

  return {
    low: summaryAt(params.guests?.min ?? null, params.additionalFoodSubtotalCents?.low),
    high: summaryAt(params.guests?.max ?? null, params.additionalFoodSubtotalCents?.high),
  }
}

export function toCurrency(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToDollars(cents))
}

export function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return ""

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function fromDateInputValue(dateValue: string): string {
  if (!dateValue) return ""
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString()
}
