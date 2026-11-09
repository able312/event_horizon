import type { ReactNode } from "react"

import {
  GRATUITY_RATE,
  HST_RATE,
  toCurrency,
  type FinancialSummary,
  type PerGuestBreakdown,
} from "~/features/event-detail/workspace/lib/financial"
import { formatCurrencyRange } from "~/features/preview/lib/foodPackages"

const HST_LABEL = `HST (${Math.round(HST_RATE * 100)}%)`
const GRATUITY_LABEL = `Gratuity (${Math.round(GRATUITY_RATE * 100)}% on Food + Beverage)`

/**
 * The totals block. Takes the low and high summaries (equal unless the estimate depends on
 * the food package chosen, the guest count or add-ons) and prints each figure as a range where they differ.
 */
export function FinancialTotals({
  low,
  high,
  showChargeBreakdown,
  showPaymentStatus = false,
  rangeNote = null,
}: {
  low: FinancialSummary
  high: FinancialSummary
  showChargeBreakdown: boolean
  /** Print payments made and balance due (invoice only); the caller turns this off when there are no payments. */
  showPaymentStatus?: boolean
  /** Why the totals are a range, e.g. "by guest count"; printed after "Grand Total". */
  rangeNote?: string | null
}) {
  return (
    <TotalsList>
      {showChargeBreakdown ? (
        <>
          <TotalsRow label="Subtotal" value={formatCurrencyRange(low.chargesSubtotalCents, high.chargesSubtotalCents)} />
          <TotalsRow label={HST_LABEL} value={formatCurrencyRange(low.hstCents, high.hstCents)} />
          <TotalsRow label={GRATUITY_LABEL} value={formatCurrencyRange(low.gratuityCents, high.gratuityCents)} />
        </>
      ) : null}

      <TotalsRow
        label={`Grand Total${rangeNote ? ` (${rangeNote})` : ""}`}
        value={formatCurrencyRange(low.grandTotalCents, high.grandTotalCents)}
        emphasis
      />

      {showPaymentStatus ? (
        <>
          <TotalsRow label="Payments Made" value={toCurrency(low.paidTotalCents)} />
          <TotalsRow label="Balance Due" value={formatCurrencyRange(low.balanceDueCents, high.balanceDueCents)} />
        </>
      ) : null}
    </TotalsList>
  )
}

/** The totals block as each guest's share: low is the cheapest end, high the dearest. */
export function PerPersonTotals({
  low,
  high,
  showChargeBreakdown,
  rangeNote = null,
}: {
  low: PerGuestBreakdown
  high: PerGuestBreakdown
  showChargeBreakdown: boolean
  /** Why the per-person price is a range; printed after "Per Person Total". */
  rangeNote?: string | null
}) {
  return (
    <TotalsList>
      {showChargeBreakdown ? (
        <>
          <TotalsRow label="Subtotal" value={formatCurrencyRange(low.subtotalCents, high.subtotalCents)} />
          <TotalsRow label={HST_LABEL} value={formatCurrencyRange(low.hstCents, high.hstCents)} />
          <TotalsRow label={GRATUITY_LABEL} value={formatCurrencyRange(low.gratuityCents, high.gratuityCents)} />
        </>
      ) : null}
      <TotalsRow
        label={`Per Person Total${rangeNote ? ` (${rangeNote})` : ""}`}
        value={formatCurrencyRange(low.totalCents, high.totalCents)}
        emphasis
      />
    </TotalsList>
  )
}

function TotalsList({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 flex justify-end border-t border-dashed border-black">
      <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 pb-2 pt-1 text-sm">{children}</dl>
    </div>
  )
}

function TotalsRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`whitespace-nowrap text-end tabular-nums ${emphasis ? "font-bold" : "font-medium"}`}>{value}</dd>
    </>
  )
}
