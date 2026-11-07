import type { ReactNode } from "react"

import type { MenuOfChargeItem, PricingBasis } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  computeBillableLineTotalCents,
  getPackagePricePerPersonCents,
  getPackageQuantity,
  getPricingBasis,
  isCoveredByPackagePrice,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import {
  formatCurrencyRange,
  formatGuestCountRange,
  type FoodPackageEstimateRow,
  type GuestCountRange,
} from "~/features/preview/lib/foodPackages"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
  isBillableLineItem,
  isEstimateBillableLineItem,
} from "~/features/preview/preferences/selectors"
import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"
import { ChargeRow, ChargeTable } from "./ChargeTable"

const CHARGE_CATEGORIES = ["Venue", "Golf", "Goods", "Service", "Food & Beverage"] as const

export type PricedRow = {
  id: string
  name: string
  unitPriceCents: number | null | undefined
  quantity: number | null | undefined
  pricingBasis?: PricingBasis | null
}

export type ChargeTableSpec = {
  id: string
  title: string
  rows: ReactNode
}

/** Groups menu-of-charge items by category; items without one go under "Other". */
export function groupChargeItemsByCategory(
  items: MenuOfChargeItem[] | undefined,
): Record<string, MenuOfChargeItem[]> {
  return (items ?? []).reduce(
    (acc, item) => {
      const category = item.category || "Other"
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, MenuOfChargeItem[]>,
  )
}

export type ChargeRowCells = {
  cost: string
  /** Null when the cost cell carries the whole per-person rate and spans the quantity column. */
  quantity: string | null
  total: string
}

/**
 * The printed cells of a priced line. With `perPersonGuests` given (the estimate), a priced
 * per-person line reads "$45.00 per person × 80–120 guests" with its total as a range, or,
 * without a guest count, shows "per person" in place of a total. Omitted (the invoice),
 * every line is quantity × price.
 */
export function formatChargeRowCells(
  item: Omit<PricedRow, "id" | "name">,
  perPersonGuests?: GuestCountRange | null,
): ChargeRowCells {
  const priceCents = item.unitPriceCents ?? 0
  if (perPersonGuests !== undefined && getPricingBasis(item) === "per_person" && priceCents > 0) {
    if (!perPersonGuests) return { cost: toCurrency(priceCents), quantity: "", total: "per person" }
    return {
      cost: `${toCurrency(priceCents)} per person × ${formatGuestCountRange(perPersonGuests)}`,
      quantity: null,
      total: formatCurrencyRange(priceCents * perPersonGuests.min, priceCents * perPersonGuests.max),
    }
  }

  const totalCents = computeBillableLineTotalCents(item)
  return {
    cost: formatPreviewPrice(item.unitPriceCents, toCurrency),
    quantity: formatPreviewQuantity(item.quantity),
    total: totalCents > 0 ? toCurrency(totalCents) : "",
  }
}

/**
 * The estimate's food lines: each timeblock's priced items, with a timeblock's package price
 * printed as one per-person line in place of the per-person items it covers.
 */
export function buildEstimateFoodRows(timeblocks: TimeblockWithItems[]): PricedRow[] {
  return timeblocks.flatMap((timeblock) => {
    const items = (timeblock.foodItems ?? [])
      .filter((item) => !isCoveredByPackagePrice(timeblock, item))
      .filter(isEstimateBillableLineItem)
    const packagePrice = getPackagePricePerPersonCents(timeblock)
    if (packagePrice == null || packagePrice <= 0) return items
    const packageRow: PricedRow = {
      id: `package-price-${timeblock.id}`,
      name: timeblock.title || "Untitled",
      unitPriceCents: packagePrice,
      quantity: null,
      pricingBasis: "per_person",
    }
    return [packageRow, ...items]
  })
}

/**
 * The invoice's food lines: each item's quantity × price, with a timeblock's package price
 * billed as one line × its final quantity in place of the per-person items it covers. Until the
 * quantity is set, that line prints with no quantity or total (see needsPackageQuantity).
 */
export function buildInvoiceFoodRows(timeblocks: TimeblockWithItems[]): PricedRow[] {
  return timeblocks.flatMap((timeblock) => {
    const items = (timeblock.foodItems ?? [])
      .filter((item) => !isCoveredByPackagePrice(timeblock, item))
      .filter(isBillableLineItem)
    const packagePrice = getPackagePricePerPersonCents(timeblock)
    if (packagePrice == null) return items
    const packageRow: PricedRow = {
      id: `package-price-${timeblock.id}`,
      name: `${timeblock.title || "Untitled"} (package)`,
      unitPriceCents: packagePrice,
      quantity: getPackageQuantity(timeblock),
      pricingBasis: "each",
    }
    return [packageRow, ...items]
  })
}

function renderPricedRows(items: PricedRow[], perPersonGuests?: GuestCountRange | null): ReactNode {
  return items.map((item) => (
    <ChargeRow key={item.id} name={item.name} {...formatChargeRowCells(item, perPersonGuests)} />
  ))
}

function formatPackageRowTotal(row: FoodPackageEstimateRow): string {
  return row.lowCents > 0 || row.highCents > 0 ? formatCurrencyRange(row.lowCents, row.highCents) : ""
}

/**
 * One table per charge category, in print order. Food & Beverage combines the billable food
 * and beverage lines, the package rows and any Food & Beverage charge items, and is left out
 * when all of those are empty. Uncategorised items print last under "Other". Pass
 * `perPersonGuests` (null when the event has no guest count) for the estimate's per-person
 * pricing of food and beverage lines; leave it out for quantity × price throughout.
 */
export function buildChargeTableSpecs(params: {
  chargeItemsByCategory: Record<string, MenuOfChargeItem[]>
  billableFoodRows: PricedRow[]
  billableBeverageRows: PricedRow[]
  foodPackageRows: FoodPackageEstimateRow[]
  perPersonGuests?: GuestCountRange | null
}): ChargeTableSpec[] {
  const { chargeItemsByCategory, billableFoodRows, billableBeverageRows, foodPackageRows, perPersonGuests } =
    params
  const foodBeverageChargeItems = chargeItemsByCategory["Food & Beverage"] ?? []
  const hasFoodBeverageSection =
    billableFoodRows.length > 0 ||
    billableBeverageRows.length > 0 ||
    foodPackageRows.length > 0 ||
    foodBeverageChargeItems.length > 0

  const specs: ChargeTableSpec[] = []

  for (const category of CHARGE_CATEGORIES) {
    if (category === "Food & Beverage") {
      if (!hasFoodBeverageSection) continue
      specs.push({
        id: "financial-table-food-beverage",
        title: "Food & Beverage",
        rows: (
          <>
            {renderPricedRows(billableFoodRows, perPersonGuests)}
            {foodPackageRows.map((row) => (
              <ChargeRow key={row.key} name={row.name} cost="" quantity="" total={formatPackageRowTotal(row)} />
            ))}
            {renderPricedRows(billableBeverageRows, perPersonGuests)}
            {renderPricedRows(foodBeverageChargeItems)}
          </>
        ),
      })
      continue
    }

    const items = chargeItemsByCategory[category]
    if (!items || items.length === 0) continue

    specs.push({
      id: `financial-table-${category.toLowerCase()}`,
      title: category,
      rows: <>{renderPricedRows(items)}</>,
    })
  }

  const otherItems = chargeItemsByCategory["Other"] ?? []
  if (otherItems.length > 0) {
    specs.push({
      id: "financial-table-other",
      title: "Other",
      rows: <>{renderPricedRows(otherItems)}</>,
    })
  }

  return specs
}

/**
 * One kept-together block per charge table. Returns PreviewBlocks (not a component) because
 * PreviewDocument paginates its direct blocks.
 */
export function renderChargeTableBlocks(specs: ChargeTableSpec[]): ReactNode[] {
  return specs.map((table) => (
    <PreviewBlock key={table.id} id={table.id} keepTogether className="mb-6">
      <ChargeTable title={table.title}>{table.rows}</ChargeTable>
    </PreviewBlock>
  ))
}
