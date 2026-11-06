import type { ReactNode } from "react"

import type { MenuOfChargeItem } from "~/definitions/database"
import { computeBillableLineTotalCents } from "~/features/event-detail/workspace/lib/financial"
import type { FoodPackageEstimateRow } from "~/features/preview/lib/foodPackages"
import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"
import { ChargeRow, ChargeTable } from "./ChargeTable"

const CHARGE_CATEGORIES = ["Venue", "Golf", "Goods", "Service", "Food & Beverage"] as const

type PricedRow = {
  id: string
  name: string
  unitPriceCents: number | null | undefined
  quantity: number | null | undefined
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

function renderPricedRows(items: PricedRow[]): ReactNode {
  return items.map((item) => (
    <ChargeRow
      key={item.id}
      name={item.name}
      unitPriceCents={item.unitPriceCents}
      quantity={item.quantity}
      totalCents={computeBillableLineTotalCents(item)}
    />
  ))
}

/**
 * One table per charge category, in print order. Food & Beverage combines the billable food
 * and beverage lines, the package rows and any Food & Beverage charge items, and is left out
 * when all of those are empty. Uncategorised items print last under "Other".
 */
export function buildChargeTableSpecs(params: {
  chargeItemsByCategory: Record<string, MenuOfChargeItem[]>
  billableFoodRows: PricedRow[]
  billableBeverageRows: PricedRow[]
  foodPackageRows: FoodPackageEstimateRow[]
}): ChargeTableSpec[] {
  const { chargeItemsByCategory, billableFoodRows, billableBeverageRows, foodPackageRows } = params
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
            {renderPricedRows(billableFoodRows)}
            {foodPackageRows.map((row) => (
              <ChargeRow
                key={row.key}
                name={row.name}
                unitPriceCents={null}
                quantity={null}
                totalCents={row.totalCents}
              />
            ))}
            {renderPricedRows(billableBeverageRows)}
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
