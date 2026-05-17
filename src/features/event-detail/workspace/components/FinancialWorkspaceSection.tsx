import React from "react"
import { useNavigate } from "react-router"

import MenuOfChargeSection from "~/features/event-detail/sections/financial-workspace/MenuOfChargeSection"
import PaymentsSection from "~/features/event-detail/sections/financial-workspace/PaymentsSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { HST_RATE, GRATUITY_RATE, computeFinancialSummaryAllSources, toCurrency } from "~/features/event-detail/workspace/lib/financial"

interface FinancialWorkspaceSectionProps {
  eventId: string
  onSelectWorkspaceNode: (nodeId: string) => void
}

const FinancialWorkspaceSection: React.FC<FinancialWorkspaceSectionProps> = ({ eventId, onSelectWorkspaceNode }) => {
  const navigate = useNavigate()
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const {
    data: foodTimeblocks,
    updateItem: updateFoodItem,
  } = useFoodSection()
  const {
    data: beverageTimeblocks,
    updateItem: updateBeverageItem,
  } = useBeverageSection()
  const { data: payments } = usePaymentsSection()

  const summary = computeFinancialSummaryAllSources({
    menuItems,
    foodTimeblocks,
    beverageTimeblocks,
    payments,
  })

  const handleGenerateEstimate = () => {
    if (!eventId) return
    navigate(`/preview/financial-report/${eventId}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xs border border-border bg-gradient-to-b from-muted/35 to-muted/10 p-3 shadow-sm">
        <h3 className="text-sm font-semibold tracking-wide">Financial Summary</h3>
        <div className="mt-2 grid grid-cols-1 gap-0.5 text-sm md:grid-cols-2 xl:grid-cols-5 bg-stone-200">
          <SummaryField label="Subtotal" value={toCurrency(summary.chargesSubtotalCents)} />
          <SummaryField label={`HST (${Math.round(HST_RATE * 100)}%)`} value={toCurrency(summary.hstCents)} />
          <SummaryField
            label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
            value={toCurrency(summary.gratuityCents)}
          />
          <SummaryField label="Grand Total" value={toCurrency(summary.grandTotalCents)} />
          <SummaryField label="Balance Remaining" value={toCurrency(summary.balanceDueCents)} emphasis />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
          <MenuOfChargeSection
            emptyStateMode="workspace"
            foodTimeblocks={foodTimeblocks ?? []}
            beverageTimeblocks={beverageTimeblocks ?? []}
            onNavigateToFood={() => onSelectWorkspaceNode("category:food")}
            onNavigateToBeverage={() => onSelectWorkspaceNode("category:beverage")}
            onUpdateFoodBillingItem={updateFoodItem}
            onUpdateBeverageBillingItem={updateBeverageItem}
          />
        </div>

        <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
          <PaymentsSection
            emptyStateMode="workspace"
            onGenerateEstimate={handleGenerateEstimate}
          />
        </div>
      </div>
    </div>
  )
}

interface SummaryFieldProps {
  label: string
  value: string
  emphasis?: boolean
}

const SummaryField: React.FC<SummaryFieldProps> = ({ label, value, emphasis = false }) => (
  <div className={emphasis
    ? " border-b-2 border-b-orange-500 bg-background px-3 py-2"
    : "bg-background px-3 py-2"}
  >
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={emphasis ? "text-base font-semibold text-foreground" : "text-sm font-medium"}>{value}</p>
  </div>
)

export default FinancialWorkspaceSection
