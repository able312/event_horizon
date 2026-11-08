import React from "react"

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
import { useOpenPreview } from "../hooks/useOpenPreview"
import type { EventResource } from "~/features/event-detail/types"
import { formatCurrencyRange, resolveGuestCountRange } from "~/features/preview/lib/foodPackages"
import EstimateGuestCountField from "./EstimateGuestCountField"
import WorkspaceSummaryField from "./WorkspaceSummaryField"
import { GeneratePreviewButton } from "./GeneratePreviewButton"

interface FinancialWorkspaceSectionProps {
  eventResource: EventResource
  onSelectWorkspaceNode: (nodeId: string) => void
}

const FinancialWorkspaceSection: React.FC<FinancialWorkspaceSectionProps> = ({ eventResource, onSelectWorkspaceNode }) => {
  const { event, updateEvent } = eventResource
  const openPreview = useOpenPreview(event?.id ?? "")
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
      <div className="rounded-xs border border-border bg-gradient-to-b from-muted/35 to-muted/10 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold tracking-wide">Estimate Summary</h3>
            <EstimateGuestCountField event={event} updateEvent={updateEvent} />
          </div>
          <GeneratePreviewButton label="Generate Estimate" onClick={() => openPreview("financial-report")} />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-0.5 text-sm md:grid-cols-2 xl:grid-cols-4 bg-stone-200">
          <WorkspaceSummaryField label="Subtotal" value={formatRange((s) => s.chargesSubtotalCents)} />
          <WorkspaceSummaryField label={`HST (${Math.round(HST_RATE * 100)}%)`} value={formatRange((s) => s.hstCents)} />
          <WorkspaceSummaryField
            label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
            value={formatRange((s) => s.gratuityCents)}
          />
          <WorkspaceSummaryField label="Grand Total" value={formatRange((s) => s.grandTotalCents)} emphasis />
        </div>
      </div>

      <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
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

      <div className="rounded-xs border border-border bg-background p-3 shadow-sm">
        <EstimateProposalSection
          grandTotal={{ lowCents: low.grandTotalCents, highCents: high.grandTotalCents }}
        />
      </div>
    </div>
  )
}

export default FinancialWorkspaceSection
