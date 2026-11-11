import React, { useMemo } from "react"

import type { BeverageItem, FoodItem, PricingBasis } from "~/definitions/database"
import { ITER_PRICING_BASIS, PRICING_BASIS_LABELS } from "~/definitions/sections/section-constants"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { isAddOn } from "~/features/event-detail/workspace/lib/estimateAddOns"
import {
  centsToDollars,
  dollarsToCents,
  getPackagePricePerPersonCents,
  getPricingBasis,
  isCoveredByPackagePrice,
  parseDollarsToCents,
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
import { computeEstimateLineTotal, sumEstimatePlanning, type CentsRange } from "./estimateLineTotals"

export type BillingItemUpdates = {
  quantity?: number | null
  unitPriceCents?: number | null
  pricingBasis?: PricingBasis
  isAddOn?: boolean
}

export type BillingTimeblockUpdates = {
  isAddOn?: boolean
  packagePricePerPersonCents?: number | null
}

type BillingItem = Pick<FoodItem, "id" | "name" | "quantity" | "unitPriceCents" | "pricingBasis" | "isAddOn">

/** How a row counts toward the estimate, beyond its own pricing. */
type RowStatus = "counted" | "add-on" | "in-add-on-timeblock" | "in-package-price" | "add-on-in-package-price"

const PLANNING_BILLING_CARD_CLASS = "rounded-xs border border-border bg-background p-3 shadow-sm"
const PLANNING_BILLING_TABLE_CLASS = `${SECTION_TABLE_CLASS} table-fixed min-w-[700px]`
const CELL_INPUT_CLASS =
  "ml-auto block h-7 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"

function formatLineTotal(total: CentsRange | null): string {
  return total ? formatCurrencyRange(total.lowCents, total.highCents) : "Needs guest count"
}

const ROW_STATUS_NOTE: Record<Exclude<RowStatus, "counted">, string> = {
  "add-on": "Add-on, not in total",
  "in-add-on-timeblock": "Add-on, not in total",
  "in-package-price": "In package price",
  "add-on-in-package-price": "Add-on, but the package price covers per-person items: price it Each to charge extra",
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
      (price × guests). Tick Add-on to offer an item separately, left out of the total until the client accepts it.
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
  /** Timeblock-level controls (food only): add-on and package price. */
  controls?: React.ReactNode
  children: React.ReactNode
}> = ({ heading, isEmpty, onNavigateToPlanning, controls, children }) => (
  <div className="space-y-0.5">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-2 py-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
      {controls}
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
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
              <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Add-on</th>
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
  status: RowStatus
  onUpdate?: (updates: BillingItemUpdates) => void
}> = ({ label, item, guests, status, onUpdate }) => {
  const pricingBasis = getPricingBasis(item)
  const isPerPerson = pricingBasis === "per_person"
  const statusNote = status === "counted" ? null : ROW_STATUS_NOTE[status]

  return (
    <tr className={`${SECTION_TABLE_BODY_ROW_CLASS} ${status === "add-on" ? "bg-sky-50/60" : ""} ${status === "add-on-in-package-price" ? "bg-amber-50" : ""}`}>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-xs text-foreground`}>{item.name || "Untitled item"}</td>
      <td className={SECTION_TABLE_BODY_CELL_CLASS}>
        <input
          type="checkbox"
          checked={isAddOn(item)}
          // A per-person item under a package price is covered by it, so accepting it as an
          // add-on would charge nothing extra; only an already-ticked one can be unticked.
          disabled={status === "in-add-on-timeblock" || status === "in-package-price"}
          onChange={(e) => onUpdate?.({ isAddOn: e.target.checked })}
          className="h-3.5 w-3.5 accent-orange-500"
          title={status === "in-package-price"
            ? "Covered by the package price. Price it Each to offer it as a paid add-on."
            : "Offer as an optional add-on, left out of the total until the client accepts it"}
          aria-label={`${label} Add-on`}
        />
      </td>
      <td className={SECTION_TABLE_BODY_CELL_CLASS}>
        <select
          value={pricingBasis}
          onChange={(e) => onUpdate?.({ pricingBasis: e.target.value as PricingBasis })}
          className="h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-xs focus:border-primary focus:outline-none"
          aria-label={`${label} Pricing`}
        >
          {ITER_PRICING_BASIS.map((basis) => (
            <option key={basis} value={basis}>
              {PRICING_BASIS_LABELS[basis]}
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
          className={`${CELL_INPUT_CLASS} w-20 ${status === "in-package-price" ? "text-muted-foreground" : ""}`}
          title={status === "in-package-price" ? "Not used on the estimate: the package price covers this item." : undefined}
          aria-label={`${label} Unit Price`}
        />
        {isPerPerson ? <span className="block text-[10px] text-muted-foreground">per person</span> : null}
      </td>
      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right text-xs font-medium`}>
        {status === "in-package-price" ? (
          <span className="text-muted-foreground">{statusNote}</span>
        ) : (
          <>
            <span className={statusNote ? "text-muted-foreground" : undefined}>
              {formatLineTotal(computeEstimateLineTotal(item, guests))}
            </span>
            {statusNote ? (
              <span className={`block text-[10px] ${status === "add-on-in-package-price" ? "text-amber-700" : "text-sky-700"}`}>
                {statusNote}
              </span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  )
}

const TimeblockBillingControls: React.FC<{
  timeblock: TimeblockWithItems
  onUpdate?: (updates: BillingTimeblockUpdates) => void
}> = ({ timeblock, onUpdate }) => {
  const packagePrice = getPackagePricePerPersonCents(timeblock)
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <label className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground">Package price / person ($)</span>
        <input
          key={packagePrice ?? "none"}
          type="text"
          inputMode="decimal"
          placeholder="None"
          defaultValue={packagePrice == null ? "" : centsToDollars(packagePrice).toFixed(2)}
          onBlur={(e) => {
            const value = e.target.value.trim()
            const parsed = value ? parseDollarsToCents(value) : null
            if (value && parsed == null) {
              // Not a number: keep the saved price rather than store $0.
              e.target.value = packagePrice == null ? "" : centsToDollars(packagePrice).toFixed(2)
              return
            }
            const next = parsed == null ? null : Math.max(0, parsed)
            if (next !== packagePrice) onUpdate?.({ packagePricePerPersonCents: next })
          }}
          className={`${CELL_INPUT_CLASS} w-20`}
          title="Replaces this timeblock's per-person item prices. Fixed-price items (each), like platters, still add their own price."
          aria-label={`${timeblock.title} Package price per person`}
        />
      </label>
      <label className="inline-flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={isAddOn(timeblock)}
          onChange={(e) => onUpdate?.({ isAddOn: e.target.checked })}
          className="h-3.5 w-3.5 accent-orange-500"
          aria-label={`${timeblock.title} Add-on`}
        />
        <span className="text-muted-foreground">Whole timeblock is an add-on</span>
      </label>
    </div>
  )
}

function foodRowStatus(timeblock: TimeblockWithItems, item: BillingItem): RowStatus {
  // An item flagged on its own is a separate add-on even inside an add-on timeblock, so it
  // stays visible and can be unticked there.
  if (isAddOn(item)) return isCoveredByPackagePrice(timeblock, item) ? "add-on-in-package-price" : "add-on"
  if (isAddOn(timeblock)) return "in-add-on-timeblock"
  if (isCoveredByPackagePrice(timeblock, item)) return "in-package-price"
  return "counted"
}

export const FoodPlanningBillingSection: React.FC<{
  timeblocks: TimeblockWithItems[]
  guests: GuestCountRange | null
  onNavigateToPlanning?: () => void
  onUpdateItem?: (payload: { timeblockId: string; itemId: string; updates: BillingItemUpdates }) => void
  onUpdateTimeblock?: (payload: { timeblockId: string; updates: BillingTimeblockUpdates }) => void
}> = ({ timeblocks, guests, onNavigateToPlanning, onUpdateItem, onUpdateTimeblock }) => {
  const subtotal = sumEstimatePlanning(timeblocks, [], guests).food

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
            heading={isAddOn(timeblock) ? `${timeblock.title} (add-on)` : timeblock.title}
            isEmpty={items.length === 0}
            onNavigateToPlanning={onNavigateToPlanning}
            controls={
              <TimeblockBillingControls
                timeblock={timeblock}
                onUpdate={(updates) => onUpdateTimeblock?.({ timeblockId: timeblock.id, updates })}
              />
            }
          >
            {items.map((item) => (
              <EstimateBillingRow
                key={item.id}
                label="Food"
                item={item}
                guests={guests}
                status={foodRowStatus(timeblock, item)}
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
      subtotal={sumEstimatePlanning([], items, guests).beverage}
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
              status={isAddOn(item) ? "add-on" : "counted"}
              onUpdate={(updates) => onUpdateItem?.({ itemId: item.id, updates })}
            />
          ))}
        </PlanningBillingGroup>
      ))}
    </PlanningBillingCard>
  )
}
