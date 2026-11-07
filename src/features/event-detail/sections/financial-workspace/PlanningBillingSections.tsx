import React, { useMemo } from "react"

import type { BeverageItem, FoodItem, PricingBasis } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import {
  centsToDollars,
  dollarsToCents,
  getPricingBasis,
} from "~/features/event-detail/workspace/lib/financial"
import { formatCurrencyRange, type GuestCountRange } from "~/features/preview/lib/foodPackages"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "../../../../components/event-detail/detail-sections/sections/tableStyles"
import { computeEstimateLineTotal, sumEstimateBillingItems, type CentsRange } from "./estimateLineTotals"

export type BillingItemUpdates = {
  quantity?: number | null
  unitPriceCents?: number | null
  pricingBasis?: PricingBasis
}

type BillingItem = Pick<FoodItem, "id" | "name" | "quantity" | "unitPriceCents" | "pricingBasis">

const PRICING_BASIS_OPTIONS: Array<{ value: PricingBasis; label: string }> = [
  { value: "each", label: "Each" },
  { value: "per_person", label: "Per person" },
]

const PLANNING_BILLING_CARD_CLASS = "rounded-xs border border-border bg-background p-3 shadow-sm"
const PLANNING_BILLING_TABLE_CLASS = `${SECTION_TABLE_CLASS} table-fixed min-w-[640px]`
const CELL_INPUT_CLASS =
  "ml-auto block h-7 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"

function formatLineTotal(total: CentsRange | null): string {
  return total ? formatCurrencyRange(total.lowCents, total.highCents) : "Needs guest count"
}

function renderPlanningCta(onNavigateToPlanning?: () => void, prefix = "Start planning") {
  if (!onNavigateToPlanning) return null

  return (
    <button
      type="button"
      onClick={onNavigateToPlanning}
      className="inline-flex items-center text-xs font-medium text-primary hover:underline"
    >
      {prefix}
    </button>
  )
}

const PlanningBillingCard: React.FC<{
  title: string
  isEmpty: boolean
  emptyLabel: string
  subtotal: CentsRange
  onNavigateToPlanning?: () => void
  children: React.ReactNode
}> = ({ title, isEmpty, emptyLabel, subtotal, onNavigateToPlanning, children }) => (
  <div className={`${PLANNING_BILLING_CARD_CLASS} space-y-2`}>
    <div className="flex items-center gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <span className="rounded-full border border-border bg-orange-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-700">
        From Planning
      </span>
    </div>
    <p className="text-xs text-muted-foreground">
      These items are organized in planning. Set how each is priced here: each (quantity × price) or per person
      (price × guests).
    </p>

    {isEmpty ? (
      <div className="rounded-xs border border-dashed border-border px-3 py-3 text-xs text-muted-foreground bg-red-50">
        <span className="text-red-800">{emptyLabel} </span>
        {renderPlanningCta(onNavigateToPlanning)}
      </div>
    ) : (
      <div className="space-y-3">{children}</div>
    )}

    <div className="px-1.5 pt-1 text-right text-xs font-medium text-foreground">
      {title} Subtotal: {formatCurrencyRange(subtotal.lowCents, subtotal.highCents)}
    </div>
  </div>
)

const PlanningBillingGroup: React.FC<{
  heading: string
  isEmpty: boolean
  onNavigateToPlanning?: () => void
  children: React.ReactNode
}> = ({ heading, isEmpty, onNavigateToPlanning, children }) => (
  <div className="space-y-0.5">
    <div className="border-b border-border/70 bg-muted/25 px-2 py-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
    </div>

    {isEmpty ? (
      <div className="rounded-xs border border-dashed border-border px-3 py-3 text-xs text-muted-foreground bg-yellow-50">
        <span>There are no items for this. </span>
        {renderPlanningCta(onNavigateToPlanning)}
      </div>
    ) : (
      <div className={SECTION_TABLE_CONTAINER_CLASS}>
        <table className={PLANNING_BILLING_TABLE_CLASS}>
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Pricing</th>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price ($)</th>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    )}
  </div>
)

const EstimateBillingRow: React.FC<{
  label: string
  item: BillingItem
  guests: GuestCountRange | null
  onUpdate?: (updates: BillingItemUpdates) => void
}> = ({ label, item, guests, onUpdate }) => {
  const pricingBasis = getPricingBasis(item)
  const isPerPerson = pricingBasis === "per_person"

  return (
    <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-xs text-foreground`}>{item.name || "Untitled item"}</td>
      <td className={SECTION_TABLE_BODY_CELL_CLASS}>
        <select
          value={pricingBasis}
          onChange={(e) => onUpdate?.({ pricingBasis: e.target.value as PricingBasis })}
          className="h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-xs focus:border-primary focus:outline-none"
          aria-label={`${label} Pricing`}
        >
          {PRICING_BASIS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
        <input
          type="number"
          min="0"
          defaultValue={item.quantity ?? 0}
          onBlur={(e) => onUpdate?.({ quantity: Math.max(0, Number(e.target.value) || 0) })}
          className={`${CELL_INPUT_CLASS} w-14 ${isPerPerson ? "text-muted-foreground" : ""}`}
          title={isPerPerson ? "Not used on the estimate. The invoice bills quantity × price." : undefined}
          aria-label={`${label} Quantity`}
        />
      </td>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
        <input
          type="text"
          inputMode="decimal"
          defaultValue={centsToDollars(item.unitPriceCents).toFixed(2)}
          onBlur={(e) => onUpdate?.({ unitPriceCents: Math.max(0, dollarsToCents(e.target.value)) })}
          className={`${CELL_INPUT_CLASS} w-20`}
          aria-label={`${label} Unit Price`}
        />
        {isPerPerson ? <span className="block text-[10px] text-muted-foreground">per person</span> : null}
      </td>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right text-xs font-medium`}>
        {formatLineTotal(computeEstimateLineTotal(item, guests))}
      </td>
    </tr>
  )
}

export const FoodPlanningBillingSection: React.FC<{
  timeblocks: TimeblockWithItems[]
  guests: GuestCountRange | null
  onNavigateToPlanning?: () => void
  onUpdateItem?: (payload: { timeblockId: string; itemId: string; updates: BillingItemUpdates }) => void
}> = ({ timeblocks, guests, onNavigateToPlanning, onUpdateItem }) => {
  const subtotal = sumEstimateBillingItems(timeblocks.flatMap((timeblock) => timeblock.foodItems ?? []), guests)

  return (
    <PlanningBillingCard
      title="Food"
      isEmpty={timeblocks.length === 0}
      emptyLabel="No food timeblocks from planning yet."
      subtotal={subtotal}
      onNavigateToPlanning={onNavigateToPlanning}
    >
      {timeblocks.map((timeblock) => {
        const items = timeblock.foodItems ?? []
        return (
          <PlanningBillingGroup
            key={timeblock.id}
            heading={timeblock.title}
            isEmpty={items.length === 0}
            onNavigateToPlanning={onNavigateToPlanning}
          >
            {items.map((item) => (
              <EstimateBillingRow
                key={item.id}
                label="Food"
                item={item}
                guests={guests}
                onUpdate={(updates) => onUpdateItem?.({ timeblockId: timeblock.id, itemId: item.id, updates })}
              />
            ))}
          </PlanningBillingGroup>
        )
      })}
    </PlanningBillingCard>
  )
}

export const BeveragePlanningBillingSection: React.FC<{
  items: BeverageItem[]
  guests: GuestCountRange | null
  onNavigateToPlanning?: () => void
  onUpdateItem?: (payload: { itemId: string; updates: BillingItemUpdates }) => void
}> = ({ items, guests, onNavigateToPlanning, onUpdateItem }) => {
  const typeSections = useMemo(
    () => getVisibleBeverageTypeSections(items, { hideEmptySpecialOrders: true }),
    [items],
  )

  return (
    <PlanningBillingCard
      title="Beverage"
      isEmpty={items.length === 0}
      emptyLabel="No beverage items from planning yet."
      subtotal={sumEstimateBillingItems(items, guests)}
      onNavigateToPlanning={onNavigateToPlanning}
    >
      {typeSections.map((section) => (
        <PlanningBillingGroup
          key={section.type}
          heading={section.type}
          isEmpty={section.items.length === 0}
          onNavigateToPlanning={onNavigateToPlanning}
        >
          {section.items.map((item) => (
            <EstimateBillingRow
              key={item.id}
              label="Beverage"
              item={item}
              guests={guests}
              onUpdate={(updates) => onUpdateItem?.({ itemId: item.id, updates })}
            />
          ))}
        </PlanningBillingGroup>
      ))}
    </PlanningBillingCard>
  )
}
