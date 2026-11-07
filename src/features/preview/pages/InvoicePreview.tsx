import { useMemo } from "react"

import { computeFinancialSummaryAllSources } from "~/features/event-detail/workspace/lib/financial"
import { getFinancialDocumentKindLabels } from "~/features/preview/lib/financialDocumentKinds"
import {
  buildChargeTableSpecs,
  groupChargeItemsByCategory,
  renderChargeTableBlocks,
} from "~/features/preview/pages/financial/chargeTables"
import { FinancialHeader } from "~/features/preview/pages/financial/FinancialHeader"
import { FinancialTotals } from "~/features/preview/pages/financial/FinancialTotals"
import { PaymentsTable } from "~/features/preview/pages/financial/PaymentsTable"
import { combineQueryStates } from "~/features/preview/pagination/combineQueryStates"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { isBillableLineItem } from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { usePrimaryClient } from "~/hooks/useEventContacts"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"

/**
 * The invoice: every billable charge at its final figure, the totals and the payments
 * received. Unlike the estimate it has no package options or ranges.
 */
export default function InvoicePreview() {
  const eventQuery = useEvent()
  const event = eventQuery.data
  const clientQuery = usePrimaryClient(event?.id)
  const chargeQuery = useMenuOfChargeItemsSection()
  const chargeItems = chargeQuery.data
  const foodQuery = useFoodSection()
  const food = foodQuery.data
  const beverageQuery = useBeverageSection()
  const beverageItems = beverageQuery.items
  const paymentsQuery = usePaymentsSection()
  const payments = paymentsQuery.data ?? []
  const queries = combineQueryStates([
    eventQuery,
    clientQuery,
    chargeQuery,
    foodQuery,
    beverageQuery,
    paymentsQuery,
  ])

  const { state } = usePreviewPreferences()
  const prefs = state.invoice

  const chargeItemsByCategory = useMemo(() => groupChargeItemsByCategory(chargeItems), [chargeItems])
  const chargeTables = buildChargeTableSpecs({
    chargeItemsByCategory,
    billableFoodRows: (food ?? []).flatMap((timeblock) =>
      (timeblock.foodItems ?? []).filter(isBillableLineItem),
    ),
    billableBeverageRows: beverageItems.filter(isBillableLineItem),
    foodPackageRows: [],
  })
  const showPayments = prefs.showPaymentStatus && payments.length > 0
  const summary = computeFinancialSummaryAllSources({
    menuItems: chargeItems,
    foodTimeblocks: food,
    beverageItems,
    payments,
  })

  return (
    <PreviewDocument
      dataError={queries.error}
      dataReady={queries.ready && state.defaultsApplied.invoicePayments}
    >
      <PreviewBlock id="invoice-header" keepTogether>
        <FinancialHeader
          labels={getFinancialDocumentKindLabels("invoice")}
          client={clientQuery.data}
          eventStartDateTime={event?.startDateTime}
        />
      </PreviewBlock>

      {renderChargeTableBlocks(chargeTables)}

      <PreviewBlock id="invoice-totals" keepTogether className="mb-6">
        <FinancialTotals
          low={summary}
          high={summary}
          showChargeBreakdown={prefs.showChargeBreakdown}
          showPaymentStatus={showPayments}
        />
      </PreviewBlock>

      {showPayments ? (
        <PreviewBlock id="invoice-payments" keepTogether className="mb-6">
          <PaymentsTable payments={payments} />
        </PreviewBlock>
      ) : null}
    </PreviewDocument>
  )
}
