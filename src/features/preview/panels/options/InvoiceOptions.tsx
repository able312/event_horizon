import { PreviewOptionSection, PreviewToggleRow } from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"

/** Invoice options: what prints under the charges. */
export function InvoiceOptions() {
  const { state, dispatch } = usePreviewPreferences()
  const prefs = state.invoice
  const { data: payments } = usePaymentsSection()

  return (
    <PreviewOptionSection title="Options">
      <PreviewToggleRow
        id="invoice-charge-breakdown"
        label="Charge breakdown"
        checked={prefs.showChargeBreakdown}
        onChange={(value) => dispatch({ type: "invoice/setShowChargeBreakdown", value })}
      />
      {(payments?.length ?? 0) > 0 ? (
        <PreviewToggleRow
          id="invoice-payment-status"
          label="Payment status"
          checked={prefs.showPaymentStatus}
          onChange={(value) => dispatch({ type: "invoice/setShowPaymentStatus", value })}
        />
      ) : null}
    </PreviewOptionSection>
  )
}
