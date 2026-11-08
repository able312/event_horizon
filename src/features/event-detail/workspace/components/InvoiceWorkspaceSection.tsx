import React from "react"

import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
import InvoicePackageQuantities from "~/features/event-detail/sections/financial-workspace/InvoicePackageQuantities"
import InvoiceSummaryCard from "~/features/event-detail/sections/financial-workspace/InvoiceSummaryCard"
import { getDepositStatus } from "~/features/event-detail/sections/financial-workspace/invoiceProgress"
import PaymentsSection from "~/features/event-detail/sections/financial-workspace/PaymentsSection"
import { useEstimateDetailsSection } from "~/hooks/useEstimateDetailsSection"
import { toLocalDateKey } from "~/lib/months"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import {
  computeFinancialSummaryAllSources,
  getPackagePricePerPersonCents,
} from "~/features/event-detail/workspace/lib/financial"

/** Payments received against the event's charges, and the balance still owing. Summary on the right on wide screens, on top otherwise. */
const InvoiceWorkspaceSection: React.FC = () => {
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const { data: foodData, updateTimeblock: updateFoodTimeblock } = useFoodSection()
  const { items: beverageData } = useBeverageSection()
  // Add-ons the client has not accepted (still flagged) are not billed.
  const { foodTimeblocks, beverageItems } = splitEstimateAddOns(foodData, beverageData)
  const { data: payments } = usePaymentsSection()
  const { data: estimateDetails } = useEstimateDetailsSection()

  const summary = computeFinancialSummaryAllSources({
    menuItems,
    foodTimeblocks,
    beverageItems,
    payments,
  })

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 lg:sticky lg:top-0 lg:order-2">
        <InvoiceSummaryCard
          grandTotalCents={summary.grandTotalCents}
          paidCents={summary.paidTotalCents}
          balanceCents={summary.balanceDueCents}
          depositStatus={getDepositStatus(
            estimateDetails,
            summary.grandTotalCents,
            summary.paidTotalCents,
            toLocalDateKey(new Date()),
          )}
        />
      </div>

      <div className="min-w-0 space-y-4 lg:order-1">
        {foodTimeblocks.some((timeblock) => getPackagePricePerPersonCents(timeblock) != null) ? (
          <InvoicePackageQuantities
            timeblocks={foodTimeblocks}
            onUpdateQuantity={({ timeblockId, packageQuantity }) =>
              updateFoodTimeblock({ id: timeblockId, updates: { packageQuantity } })
            }
          />
        ) : null}

        <PaymentsSection />
      </div>
    </div>
  )
}

export default InvoiceWorkspaceSection
