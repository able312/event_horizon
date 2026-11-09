import type { BeverageItem, Event, MenuOfChargeItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  GRATUITY_RATE,
  HST_RATE,
  computeFinancialSummaryAllSources,
  computeFoodTimeblockRates,
  computePerGuestBreakdown,
  getPackagePricePerPersonCents,
  isCoveredByPackagePrice,
  toCurrency,
  type EstimateSummaryRange,
  type FinancialSummary,
  type GuestCountRange,
  type PerGuestBreakdown,
} from "~/features/event-detail/workspace/lib/financial"
import { computeAddOnSubtotal, type EstimateAddOn } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { isEstimateBillableLineItem } from "~/features/preview/preferences/selectors"

// Food packages are ordinary food timeblocks that the financial preview presents as
// alternatives the client chooses between. Nothing about them is stored: which
// timeblocks count as packages, and how the estimate treats them, are preview options.

export const FOOD_PACKAGE_ESTIMATE_MODES = ["ignore", "average", "list"] as const

/**
 * How the main estimate treats package timeblocks:
 * - ignore: left out of the totals, with one unpriced line pointing to the packages page
 * - average: one line for the average package total, counted in the totals
 * - list: one line per package; the totals become a range from the cheapest package (at the
 *   fewest guests) to the dearest (at the most)
 */
export type FoodPackageEstimateMode = (typeof FOOD_PACKAGE_ESTIMATE_MODES)[number]

export const DEFAULT_FOOD_PACKAGE_ESTIMATE_MODE: FoodPackageEstimateMode = "ignore"

export const FOOD_PACKAGE_ESTIMATE_MODE_OPTIONS: Array<{ mode: FoodPackageEstimateMode; label: string }> = [
  { mode: "ignore", label: "Leave out (certain charges only)" },
  { mode: "average", label: "Average of packages" },
  { mode: "list", label: "List each package" },
]

export type { GuestCountRange }

/**
 * The event's guest count as a range, or null when it has none. One known end stands for both.
 * A count marked final (the guest count dialog's checkbox) is the max alone, as the event
 * header shows it.
 */
export function resolveGuestCountRange(
  event: (Pick<Event, "minGuests" | "maxGuests"> & Partial<Pick<Event, "guestCountFinal">>) | null | undefined,
): GuestCountRange | null {
  const min = toGuestCount(event?.minGuests)
  const max = toGuestCount(event?.maxGuests)
  if (min == null && max == null) return null
  if (event?.guestCountFinal === 1 && max != null) return { min: max, max }
  const low = min ?? max ?? 0
  const high = max ?? min ?? 0
  return { min: Math.min(low, high), max: Math.max(low, high) }
}

function toGuestCount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const count = Math.floor(value)
  return count > 0 ? count : null
}

/** "80 guests", or "80–120 guests" for a range. */
export function formatGuestCountRange(guests: GuestCountRange): string {
  return guests.min === guests.max ? `${guests.max} guests` : `${guests.min}–${guests.max} guests`
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
  /** Quantity × price over the package's fixed-price ("each") items, e.g. platters. */
  eachSubtotalCents: number
  /**
   * What each guest adds to the package subtotal: its package price when set, otherwise its
   * per-person items' prices added up.
   */
  perPersonRateCents: number
  /** The package price per person set on the timeblock; null when its items are priced individually. */
  packagePricePerPersonCents: number | null
  /**
   * The whole package at the fewest guests (low) and the most (high). Equal without
   * per-person items; without a guest count, per-person items are left out of both.
   */
  totals: { low: ChargeBreakdown; high: ChargeBreakdown }
  /** Package total ÷ guests; null when the event has no guest count. */
  perPerson: PerPersonPricing | null
  /** Items that add nothing to the total because they have no quantity or no price. */
  unpricedItemNames: string[]
}

/** A package's subtotal for this many guests: "each" items plus per-person prices × guests (none when null). */
export function computeFoodPackageSubtotalCents(
  pkg: Pick<FoodPackageSummary, "eachSubtotalCents" | "perPersonRateCents">,
  guestCount: number | null,
): number {
  return pkg.eachSubtotalCents + (guestCount == null ? 0 : pkg.perPersonRateCents * guestCount)
}

export function summarizeFoodPackage(
  timeblock: TimeblockWithItems,
  guests: GuestCountRange | null,
): FoodPackageSummary {
  const items = timeblock.foodItems ?? []
  const rates = computeFoodTimeblockRates(timeblock)
  const subtotalAt = (guestCount: number | null) => computeFoodPackageSubtotalCents(rates, guestCount)

  return {
    timeblockId: timeblock.id,
    title: timeblock.title,
    ...rates,
    packagePricePerPersonCents: getPackagePricePerPersonCents(timeblock),
    totals: {
      low: computeFoodChargeBreakdown(subtotalAt(guests?.min ?? null)),
      high: computeFoodChargeBreakdown(subtotalAt(guests?.max ?? null)),
    },
    perPerson: guests
      ? {
          guests,
          atMaxGuests: computeFoodChargeBreakdown(subtotalAt(guests.max) / guests.max),
          atMinGuests: computeFoodChargeBreakdown(subtotalAt(guests.min) / guests.min),
        }
      : null,
    unpricedItemNames: items
      .filter((item) => !isCoveredByPackagePrice(timeblock, item) && !isEstimateBillableLineItem(item))
      .map((item) => item.name),
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

export type FoodPackageEstimate = EstimateSummaryRange & {
  mode: FoodPackageEstimateMode
  packages: FoodPackageSummary[]
  /** Average package subtotal at the fewest (low) and the most (high) guests, for the "average" line. */
  averageSubtotalCents: { low: number; high: number }
  /** Why the totals are a range, for the Grand Total label; null when low and high match. */
  rangeNote: string | null
  /**
   * One guest's share: low is the cheapest end spread over the most guests, high the dearest
   * end over the fewest. Null without a guest count to divide by.
   */
  perGuest: { low: PerGuestBreakdown; high: PerGuestBreakdown; rangeNote: string | null } | null
}

/**
 * The estimate's totals with package timeblocks handled per `mode`, as a range. The low end
 * is the fewest guests, the cheapest package ("list" mode) and no add-ons; the high end is the
 * most guests, the dearest package and every optional add-on. Per guest, the ends swap guest
 * counts: fixed-price charges weigh most when shared by the fewest guests. With no packages
 * or add-ons it is the ordinary estimate, so callers can use it unconditionally.
 */
export function computeFoodPackageEstimate(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  /** Null or empty when food packages are off. */
  packageTimeblockIds: string[] | null
  mode: FoodPackageEstimateMode
  guests: GuestCountRange | null
  /** Optional add-ons: left out of the low end, counted in the high end. */
  addOns?: Array<Pick<EstimateAddOn, "fixedCents" | "perPersonRateCents">>
}): FoodPackageEstimate {
  const { packages, certain } = splitFoodPackageTimeblocks(params.foodTimeblocks, params.packageTimeblockIds)
  const summaries = packages.map((tb) => summarizeFoodPackage(tb, params.guests))
  const lowGuests = params.guests?.min ?? null
  const highGuests = params.guests?.max ?? null
  const subtotalsAt = (guestCount: number | null) =>
    summaries.map((pkg) => computeFoodPackageSubtotalCents(pkg, guestCount))
  const averageAt = (guestCount: number | null) => {
    const subtotals = subtotalsAt(guestCount)
    return subtotals.length > 0 ? Math.round(subtotals.reduce((sum, cents) => sum + cents, 0) / subtotals.length) : 0
  }
  const averageSubtotalCents = { low: averageAt(lowGuests), high: averageAt(highGuests) }
  const packagesCounted = summaries.length > 0 && params.mode !== "ignore"
  const addOns = params.addOns ?? []

  const packageSubtotalAt = (guestCount: number | null, end: EstimateEnd): number => {
    if (!packagesCounted) return 0
    if (params.mode === "average") return averageAt(guestCount)
    const subtotals = subtotalsAt(guestCount)
    return end === "low" ? Math.min(...subtotals) : Math.max(...subtotals)
  }
  const addOnsSubtotalAt = (guestCount: number | null): number =>
    addOns.reduce(
      (sum, addOn) =>
        sum + computeAddOnSubtotal(addOn, guestCount == null ? null : { min: guestCount, max: guestCount }).lowCents,
      0,
    )

  // Add-ons are food and beverage, so they carry gratuity like the food they are added to.
  const summaryAt = (guestCount: number | null, end: EstimateEnd): FinancialSummary =>
    computeFinancialSummaryAllSources({
      menuItems: params.menuItems,
      foodTimeblocks: certain,
      beverageItems: params.beverageItems,
      additionalFoodSubtotalCents:
        packageSubtotalAt(guestCount, end) + (end === "high" ? addOnsSubtotalAt(guestCount) : 0),
      perPersonGuestCount: guestCount,
    })

  const low = summaryAt(lowGuests, "low")
  const high = summaryAt(highGuests, "high")
  const byPackage = packagesCounted && params.mode === "list" && summaries.length > 1
  const byAddOns = addOnsSubtotalAt(highGuests) > 0
  const byGuests =
    lowGuests !== highGuests && summaryAt(lowGuests, "low").grandTotalCents !== summaryAt(highGuests, "low").grandTotalCents

  return {
    low,
    high,
    mode: params.mode,
    packages: summaries,
    averageSubtotalCents,
    rangeNote:
      low.grandTotalCents !== high.grandTotalCents ? describeEstimateRange({ byPackage, byGuests, byAddOns }) : null,
    perGuest: params.guests ? computePerGuestRange(params.guests, summaryAt, { byPackage, byAddOns }) : null,
  }
}

type EstimateEnd = "low" | "high"

function computePerGuestRange(
  guests: GuestCountRange,
  summaryAt: (guestCount: number, end: EstimateEnd) => FinancialSummary,
  reasons: { byPackage: boolean; byAddOns: boolean },
): NonNullable<FoodPackageEstimate["perGuest"]> {
  const low = computePerGuestBreakdown(summaryAt(guests.max, "low"), guests.max)
  const high = computePerGuestBreakdown(summaryAt(guests.min, "high"), guests.min)
  // Per guest, the count only matters when fixed-price charges are shared across it.
  const byGuests =
    guests.min !== guests.max &&
    computePerGuestBreakdown(summaryAt(guests.min, "low"), guests.min).totalCents !== low.totalCents
  return {
    low,
    high,
    rangeNote: low.totalCents !== high.totalCents ? describeEstimateRange({ ...reasons, byGuests }) : null,
  }
}

/** e.g. "by guest count", "by package and guest count" or "by guest count and add-ons". */
export function describeEstimateRange(reasons: { byPackage: boolean; byGuests: boolean; byAddOns: boolean }): string {
  const parts = [
    reasons.byPackage ? "package" : null,
    reasons.byGuests ? "guest count" : null,
    reasons.byAddOns ? "add-ons" : null,
  ].filter((part): part is string => part != null)
  if (parts.length === 0) return "estimated range"
  if (parts.length === 1) return `by ${parts[0]}${parts[0] === "package" ? " chosen" : ""}`
  return `by ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
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
  /** A short line printed under the name. */
  note?: string
  /** At the fewest guests; 0 for the unpriced "ignore" pointer line. */
  lowCents: number
  /** At the most guests; equals lowCents unless a package has per-person items. */
  highCents: number
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
          name: `Food packages (${packages.length})`,
          note: "Priced separately, see Food Packages",
          lowCents: 0,
          highCents: 0,
        },
      ]
    case "average":
      return [
        {
          key: "food-packages-average",
          name: `Food package (average of ${packages.length})`,
          lowCents: estimate.averageSubtotalCents.low,
          highCents: estimate.averageSubtotalCents.high,
        },
      ]
    case "list":
      return packages.map((pkg) => ({
        key: `food-package-${pkg.timeblockId}`,
        name: `Food package option: ${pkg.title}`,
        lowCents: pkg.totals.low.subtotalCents,
        highCents: pkg.totals.high.subtotalCents,
      }))
  }
}
