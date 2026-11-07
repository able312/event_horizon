import React from "react"

import MenuOfChargeSection from "~/features/event-detail/sections/financial-workspace/MenuOfChargeSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { HST_RATE, GRATUITY_RATE, computeFinancialSummaryAllSources, toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { useOpenPreview } from "../hooks/useOpenPreview"
import WorkspaceSummaryField from "./WorkspaceSummaryField"
import { GeneratePreviewButton } from "./GeneratePreviewButton"

interface FinancialWorkspaceSectionProps {
  eventId: string
  onSelectWorkspaceNode: (nodeId: string) => void
}

const FinancialWorkspaceSection: React.FC<FinancialWorkspaceSectionProps> = ({ eventId, onSelectWorkspaceNode }) => {
  const openPreview = useOpenPreview(eventId)
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const {
    data: foodTimeblocks,
    updateItem: updateFoodItem,
  } = useFoodSection()
  const {
    items: beverageItems,
    updateItem: updateBeverageItem,
  } = useBeverageSection()

  const summary = computeFinancialSummaryAllSources({
    menuItems,
    foodTimeblocks,
    beverageItems,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xs border border-border bg-gradient-to-b from-muted/35 to-muted/10 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide">Financial Summary</h3>
          <GeneratePreviewButton label="Generate Estimate" onClick={() => openPreview("financial-report")} />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-0.5 text-sm md:grid-cols-2 xl:grid-cols-4 bg-stone-200">
          <WorkspaceSummaryField label="Subtotal" value={toCurrency(summary.chargesSubtotalCents)} />
          <WorkspaceSummaryField label={`HST (${Math.round(HST_RATE * 100)}%)`} value={toCurrency(summary.hstCents)} />
          <WorkspaceSummaryField
            label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
            value={toCurrency(summary.gratuityCents)}
          />
          <WorkspaceSummaryField label="Grand Total" value={toCurrency(summary.grandTotalCents)} emphasis />
        </div>
      </div>

      <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
        <MenuOfChargeSection
          emptyStateMode="workspace"
          foodTimeblocks={foodTimeblocks ?? []}
          beverageItems={beverageItems ?? []}
          onNavigateToFood={() => onSelectWorkspaceNode("category:food")}
          onNavigateToBeverage={() => onSelectWorkspaceNode("category:beverage")}
          onUpdateFoodBillingItem={updateFoodItem}
          onUpdateBeverageBillingItem={({ itemId, updates }) =>
            updateBeverageItem({ itemId, updates })
          }
        />
      </div>
    </div>
  )
}

export default FinancialWorkspaceSection
