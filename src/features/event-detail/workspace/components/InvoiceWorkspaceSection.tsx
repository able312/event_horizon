import React from "react"

import PaymentsSection from "~/features/event-detail/sections/financial-workspace/PaymentsSection"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { computeFinancialSummaryAllSources, toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { useOpenPreview } from "../hooks/useOpenPreview"
import { GeneratePreviewButton } from "./GeneratePreviewButton"
import WorkspaceSummaryField from "./WorkspaceSummaryField"

interface InvoiceWorkspaceSectionProps {
  eventId: string
}

/** Payments received against the event's charges, and the balance still owing. */
const InvoiceWorkspaceSection: React.FC<InvoiceWorkspaceSectionProps> = ({ eventId }) => {
  const openPreview = useOpenPreview(eventId)
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const { data: foodTimeblocks } = useFoodSection()
  const { items: beverageItems } = useBeverageSection()
  const { data: payments } = usePaymentsSection()

  const summary = computeFinancialSummaryAllSources({
    menuItems,
    foodTimeblocks,
    beverageItems,
    payments,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xs border border-border bg-gradient-to-b from-muted/35 to-muted/10 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide">Invoice Summary</h3>
          <GeneratePreviewButton label="Generate Invoice" onClick={() => openPreview("invoice")} />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-0.5 text-sm md:grid-cols-3 bg-stone-200">
          <WorkspaceSummaryField label="Grand Total" value={toCurrency(summary.grandTotalCents)} />
          <WorkspaceSummaryField label="Payments Received" value={toCurrency(summary.paidTotalCents)} />
          <WorkspaceSummaryField label="Balance Remaining" value={toCurrency(summary.balanceDueCents)} emphasis />
        </div>
      </div>

      <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
        <PaymentsSection />
      </div>
    </div>
  )
}

export default InvoiceWorkspaceSection
