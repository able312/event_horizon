import React from "react"

import MenuOfChargeSection from "~/features/event-detail/sections/financial-workspace/MenuOfChargeSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import {
  GRATUITY_RATE,
  HST_RATE,
  computeGrandTotalPerGuest,
  type FinancialSummary,
} from "~/features/event-detail/workspace/lib/financial"
import type { EventResource } from "~/features/event-detail/types"
import { formatCurrencyRange } from "~/features/preview/lib/foodPackages"
import { useEstimateTotals } from "../hooks/useEstimateTotals"
import EstimateGuestCountField from "./EstimateGuestCountField"
import WorkspaceSummaryField from "./WorkspaceSummaryField"

/**
 * The summary stays pinned while the charges scroll under it, so it is a dark surface (like the
 * sidebar) to stand apart from the white cards. The upward stone-100 shadow fills the scroll
 * container's top padding so rows don't show through the gap above it.
 */
const SUMMARY_BAR_CLASS =
  "dark sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xs border border-stone-700 bg-stone-900 p-3 text-foreground shadow-[0_-1rem_0_0_var(--color-stone-100),0_8px_20px_-6px_rgb(0_0_0/0.35)]"

interface FinancialWorkspaceSectionProps {
  eventResource: EventResource
  onSelectWorkspaceNode: (nodeId: string) => void
}

const FinancialWorkspaceSection: React.FC<FinancialWorkspaceSectionProps> = ({ eventResource, onSelectWorkspaceNode }) => {
  const { event, updateEvent } = eventResource
  const { guests, low, high } = useEstimateTotals(event)
  const {
    data: foodTimeblocks,
    updateItem: updateFoodItem,
    updateTimeblock: updateFoodTimeblock,
  } = useFoodSection()
  const {
    items: beverageItems,
    updateItem: updateBeverageItem,
  } = useBeverageSection()

  const perGuest = computeGrandTotalPerGuest({ low, high }, guests)
  const formatRange = (pick: (summary: FinancialSummary) => number) => formatCurrencyRange(pick(low), pick(high))

  return (
    <div className="space-y-4">
      <section
        aria-label="Estimate Summary"
        className={SUMMARY_BAR_CLASS}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide">Estimate Summary</h3>
          <EstimateGuestCountField event={event} updateEvent={updateEvent} />
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <WorkspaceSummaryField label="Subtotal" value={formatRange((s) => s.chargesSubtotalCents)} />
          <WorkspaceSummaryField label={`HST (${Math.round(HST_RATE * 100)}%)`} value={formatRange((s) => s.hstCents)} />
          <WorkspaceSummaryField
            label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
            value={formatRange((s) => s.gratuityCents)}
          />
          <div className="border-l-2 border-orange-500 pl-3">
            <WorkspaceSummaryField label="Grand Total" value={formatRange((s) => s.grandTotalCents)} emphasis />
            {perGuest ? (
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatCurrencyRange(perGuest.lowCents, perGuest.highCents)} per guest
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="min-w-0">
        <MenuOfChargeSection
          emptyStateMode="workspace"
          foodTimeblocks={foodTimeblocks ?? []}
          beverageItems={beverageItems ?? []}
          guests={guests}
          onNavigateToFood={() => onSelectWorkspaceNode("category:food")}
          onNavigateToBeverage={() => onSelectWorkspaceNode("category:beverage")}
          onUpdateFoodBillingItem={updateFoodItem}
          onUpdateFoodBillingTimeblock={({ timeblockId, updates }) => updateFoodTimeblock({ id: timeblockId, updates })}
          onUpdateBeverageBillingItem={({ itemId, updates }) =>
            updateBeverageItem({ itemId, updates })
          }
        />
      </div>
    </div>
  )
}

export default FinancialWorkspaceSection
