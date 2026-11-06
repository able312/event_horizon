import type { BeverageItem, Event, MenuOfChargeItem, Payment } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  GRATUITY_RATE,
  HST_RATE,
  computeBillableLineTotalCents,
  computeFinancialSummaryAllSources,
  toCurrency,
  type FinancialSummary,
} from "~/features/event-detail/workspace/lib/financial"
import { isBillableLineItem } from "~/features/preview/preferences/selectors"

// Food packages are ordinary food timeblocks that the financial preview presents as
// alternatives the client chooses between. Nothing about them is stored: which
// timeblocks count as packages, and how the estimate treats them, are preview options.

export const FOOD_PACKAGE_ESTIMATE_MODES = ["ignore", "average", "list"] as const

/**
 * How the main estimate treats package timeblocks:
 * - ignore: left out of the totals, with one unpriced line pointing to the packages page
 * - average: one line for the average package total, counted in the totals
 * - list: one line per package; the totals become a range from cheapest to dearest package
 */
export type FoodPackageEstimateMode = (typeof FOOD_PACKAGE_ESTIMATE_MODES)[number]

export const DEFAULT_FOOD_PACKAGE_ESTIMATE_MODE: FoodPackageEstimateMode = "ignore"

export const FOOD_PACKAGE_ESTIMATE_MODE_OPTIONS: Array<{ mode: FoodPackageEstimateMode; label: string }> = [
  { mode: "ignore", label: "Leave out (certain charges only)" },
  { mode: "average", label: "Average of packages" },
  { mode: "list", label: "List each package" },
]

export type GuestCountRange = {
  /** Fewest guests; per-person prices are highest here. */
  min: number
  /** Most guests; per-person prices are lowest here. */
  max: number
}

/** The event's guest count as a range, or null when it has none. One known end stands for both. */
export function resolveGuestCountRange(
  event: Pick<Event, "minGuests" | "maxGuests"> | null | undefined,
): GuestCountRange | null {
  const min = toGuestCount(event?.minGuests)
  const max = toGuestCount(event?.maxGuests)
  if (min == null && max == null) return null
  const low = min ?? max ?? 0
  const high = max ?? min ?? 0
  return { min: Math.min(low, high), max: Math.max(low, high) }
}

function toGuestCount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const count = Math.floor(value)
  return count > 0 ? count : null
}

export type ChargeBreakdown = {
  subtotalCents: number
  hstCents: number
  gratuityCents: number
  /** subtotal + HST + gratuity, so the printed parts always add up. */
  totalCents: number
}

/**
 * HST and gratuity on a food amount, matching the estimate: HST on the subtotal and
 * gratuity on food before tax (no HST on gratuity). Takes fractional cents so a
 * per-person figure is rounded once per part, not compounded.
 */
export function computeFoodChargeBreakdown(subtotalCents: number): ChargeBreakdown {
  const subtotal = Math.round(subtotalCents)
  const hst = Math.round(subtotalCents * HST_RATE)
  const gratuity = Math.round(subtotalCents * GRATUITY_RATE)
  return {
    subtotalCents: subtotal,
    hstCents: hst,
    gratuityCents: gratuity,
    totalCents: subtotal + hst + gratuity,
  }
}

export type PerPersonPricing = {
  guests: GuestCountRange
  /** Per person at the most guests (the lower price). */
  atMaxGuests: ChargeBreakdown
  /** Per person at the fewest guests (the higher price). Same as atMaxGuests when the count is fixed. */
  atMinGuests: ChargeBreakdown
}

export type FoodPackageSummary = {
  timeblockId: string
  title: string
  /** The package's whole cost, from each item's quantity × price. */
  totals: ChargeBreakdown
  /** Package total ÷ guests; null when the event has no guest count. */
  perPerson: PerPersonPricing | null
  /** Items that add nothing to the total because they have no quantity or no price. */
  unpricedItemNames: string[]
}

export function summarizeFoodPackage(
  timeblock: TimeblockWithItems,
  guests: GuestCountRange | null,
): FoodPackageSummary {
  const items = timeblock.foodItems ?? []
  const subtotalCents = items.reduce((sum, item) => sum + computeBillableLineTotalCents(item), 0)

  return {
    timeblockId: timeblock.id,
    title: timeblock.title,
    totals: computeFoodChargeBreakdown(subtotalCents),
    perPerson: guests
      ? {
          guests,
          atMaxGuests: computeFoodChargeBreakdown(subtotalCents / guests.max),
          atMinGuests: computeFoodChargeBreakdown(subtotalCents / guests.min),
        }
      : null,
    unpricedItemNames: items.filter((item) => !isBillableLineItem(item)).map((item) => item.name),
  }
}

/** Splits food timeblocks into package options and the ordinary (certain) ones. */
export function splitFoodPackageTimeblocks(
  foodTimeblocks: TimeblockWithItems[] | null | undefined,
  packageTimeblockIds: string[] | null,
): { packages: TimeblockWithItems[]; certain: TimeblockWithItems[] } {
  const all = foodTimeblocks ?? []
  if (!packageTimeblockIds || packageTimeblockIds.length === 0) return { packages: [], certain: all }
  const ids = new Set(packageTimeblockIds)
  return {
    packages: all.filter((tb) => ids.has(tb.id)),
    certain: all.filter((tb) => !ids.has(tb.id)),
  }
}

export type FoodPackageEstimate = {
  mode: FoodPackageEstimateMode
  packages: FoodPackageSummary[]
  /** Average package subtotal, for the "average" line. */
  averageSubtotalCents: number
  /** Estimate totals with the cheapest package (or the only figure, outside "list"). */
  low: FinancialSummary
  /** Estimate totals with the most expensive package; equals low outside "list". */
  high: FinancialSummary
}

/**
 * The estimate's totals with package timeblocks handled per `mode`. With no packages
 * it is the ordinary summary, so callers can use it unconditionally.
 */
export function computeFoodPackageEstimate(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  payments: Payment[] | undefined
  /** Null or empty when food packages are off. */
  packageTimeblockIds: string[] | null
  mode: FoodPackageEstimateMode
  guests: GuestCountRange | null
}): FoodPackageEstimate {
  const { packages, certain } = splitFoodPackageTimeblocks(params.foodTimeblocks, params.packageTimeblockIds)
  const summaries = packages.map((tb) => summarizeFoodPackage(tb, params.guests))
  const subtotals = summaries.map((pkg) => pkg.totals.subtotalCents)
  const averageSubtotalCents =
    subtotals.length > 0 ? Math.round(subtotals.reduce((sum, cents) => sum + cents, 0) / subtotals.length) : 0

  const summaryWith = (additionalFoodSubtotalCents: number) =>
    computeFinancialSummaryAllSources({
      menuItems: params.menuItems,
      foodTimeblocks: certain,
      beverageItems: params.beverageItems,
      payments: params.payments,
      additionalFoodSubtotalCents,
    })

  if (summaries.length === 0 || params.mode === "ignore") {
    const summary = summaryWith(0)
    return { mode: params.mode, packages: summaries, averageSubtotalCents, low: summary, high: summary }
  }

  if (params.mode === "average") {
    const summary = summaryWith(averageSubtotalCents)
    return { mode: params.mode, packages: summaries, averageSubtotalCents, low: summary, high: summary }
  }

  return {
    mode: params.mode,
    packages: summaries,
    averageSubtotalCents,
    low: summaryWith(Math.min(...subtotals)),
    high: summaryWith(Math.max(...subtotals)),
  }
}

/** "$10.00", or "$8.00 – $10.00" when the two ends differ. */
export function formatCurrencyRange(lowCents: number, highCents: number): string {
  const low = Math.min(lowCents, highCents)
  const high = Math.max(lowCents, highCents)
  return low === high ? toCurrency(low) : `${toCurrency(low)} – ${toCurrency(high)}`
}

export type FoodPackageEstimateRow = {
  key: string
  name: string
  /** 0 for the unpriced "ignore" pointer line. */
  totalCents: number
}

/** The Food & Beverage lines that stand for the packages in the main estimate. */
export function buildFoodPackageEstimateRows(
  estimate: Pick<FoodPackageEstimate, "mode" | "packages" | "averageSubtotalCents">,
): FoodPackageEstimateRow[] {
  const { packages } = estimate
  if (packages.length === 0) return []

  switch (estimate.mode) {
    case "ignore":
      return [
        {
          key: "food-packages-pointer",
          name: `Food packages (${packages.length}): priced separately, see Food Packages`,
          totalCents: 0,
        },
      ]
    case "average":
      return [
        {
          key: "food-packages-average",
          name: `Food package (average of ${packages.length})`,
          totalCents: estimate.averageSubtotalCents,
        },
      ]
    case "list":
      return packages.map((pkg) => ({
        key: `food-package-${pkg.timeblockId}`,
        name: `Food package option: ${pkg.title}`,
        totalCents: pkg.totals.subtotalCents,
      }))
  }
}
