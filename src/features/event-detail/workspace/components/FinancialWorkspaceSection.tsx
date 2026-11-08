import React from "react"

import { FINANCIAL_CARD_CLASS } from "~/features/event-detail/sections/financial-workspace/FinancialCard"
import EstimateProposalSection from "~/features/event-detail/sections/financial-workspace/EstimateProposalSection"
import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
import MenuOfChargeSection from "~/features/event-detail/sections/financial-workspace/MenuOfChargeSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import {
  GRATUITY_RATE,
  HST_RATE,
  computeEstimateSummaryRange,
  type FinancialSummary,
} from "~/features/event-detail/workspace/lib/financial"
import type { EventResource } from "~/features/event-detail/types"
import { formatCurrencyRange, resolveGuestCountRange } from "~/features/preview/lib/foodPackages"
import EstimateGuestCountField from "./EstimateGuestCountField"
import WorkspaceSummaryField from "./WorkspaceSummaryField"

interface FinancialWorkspaceSectionProps {
  eventResource: EventResource
  onSelectWorkspaceNode: (nodeId: string) => void
}

const FinancialWorkspaceSection: React.FC<FinancialWorkspaceSectionProps> = ({ eventResource, onSelectWorkspaceNode }) => {
  const { event, updateEvent } = eventResource
  const guests = resolveGuestCountRange(event)
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const {
    data: foodTimeblocks,
    updateItem: updateFoodItem,
    updateTimeblock: updateFoodTimeblock,
  } = useFoodSection()
  const {
    items: beverageItems,
    updateItem: updateBeverageItem,
  } = useBeverageSection()

  // Optional add-ons are offered separately and left out of the summary.
  const counted = splitEstimateAddOns(foodTimeblocks, beverageItems)
  const { low, high } = computeEstimateSummaryRange({
    menuItems,
    foodTimeblocks: counted.foodTimeblocks,
    beverageItems: counted.beverageItems,
    guests,
  })
  const formatRange = (pick: (summary: FinancialSummary) => number) => formatCurrencyRange(pick(low), pick(high))

  return (
    <div className="space-y-4">
      <section
        aria-label="Estimate Summary"
        className={`${FINANCIAL_CARD_CLASS} sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3`}
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

      <EstimateProposalSection
        grandTotal={{ lowCents: low.grandTotalCents, highCents: high.grandTotalCents }}
      />
    </div>
  )
}

export default FinancialWorkspaceSection
