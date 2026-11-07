import {
  GRATUITY_RATE,
  HST_RATE,
  toCurrency,
  type FinancialSummary,
} from "~/features/event-detail/workspace/lib/financial"
import { formatCurrencyRange } from "~/features/preview/lib/foodPackages"

/**
 * The totals block. Takes the low and high summaries (equal unless food packages make the
 * total depend on the package chosen) and prints each figure as a range where they differ.
 */
export function FinancialTotals({
  low,
  high,
  showChargeBreakdown,
  showPaymentStatus = false,
}: {
  low: FinancialSummary
  high: FinancialSummary
  showChargeBreakdown: boolean
  /** Print payments made and balance due (invoice only); the caller turns this off when there are no payments. */
  showPaymentStatus?: boolean
}) {
  return (
    <div className="mt-10 flex justify-end border-t border-dashed border-black">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
        {showChargeBreakdown ? (
          <>
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-end font-medium">
              {formatCurrencyRange(low.chargesSubtotalCents, high.chargesSubtotalCents)}
            </dd>
            <dt className="text-muted-foreground">HST ({Math.round(HST_RATE * 100)}%)</dt>
            <dd className="text-end font-medium">
              {formatCurrencyRange(low.hstCents, high.hstCents)}
            </dd>
            <dt className="text-muted-foreground">
              Gratuity ({Math.round(GRATUITY_RATE * 100)}% on Food + Beverage)
            </dt>
            <dd className="text-end font-medium">
              {formatCurrencyRange(low.gratuityCents, high.gratuityCents)}
            </dd>
          </>
        ) : null}

        <dt className="text-muted-foreground">
          Grand Total{low.grandTotalCents !== high.grandTotalCents ? " (by package chosen)" : ""}
        </dt>
        <dd className="text-end font-medium">
          {formatCurrencyRange(low.grandTotalCents, high.grandTotalCents)}
        </dd>

        {showPaymentStatus ? (
          <>
            <dt className="text-muted-foreground">Payments Made</dt>
            <dd className="text-end font-medium">{toCurrency(low.paidTotalCents)}</dd>
            <dt className="text-muted-foreground">Balance Due</dt>
            <dd className="text-end font-medium">
              {formatCurrencyRange(low.balanceDueCents, high.balanceDueCents)}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}
