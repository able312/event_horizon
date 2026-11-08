import React from "react"
import { CircleAlert, CircleCheck, Clock } from "lucide-react"

import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { formatProposalDate } from "~/features/preview/lib/estimateProposal"
import FinancialCard from "./FinancialCard"
import { computePaidFraction, type DepositStatus } from "./invoiceProgress"

const SummaryRow: React.FC<{ label: string; value: string; emphasis?: boolean }> = ({ label, value, emphasis = false }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className={emphasis ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>{label}</dt>
    <dd className={emphasis ? "text-lg font-semibold tabular-nums text-foreground" : "text-sm font-medium tabular-nums"}>
      {value}
    </dd>
  </div>
)

const DepositStatusLine: React.FC<{ status: DepositStatus }> = ({ status }) => {
  if (status.kind === "none") return null

  if (status.kind === "received") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700">
        <CircleCheck className="size-3.5 shrink-0" />
        Deposit of {toCurrency(status.depositCents)} received
      </p>
    )
  }

  const due = formatProposalDate(status.dueDate)
  const overdue = status.kind === "overdue"
  const Icon = overdue ? CircleAlert : Clock
  return (
    <p className={`flex items-center gap-1.5 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
      <Icon className="size-3.5 shrink-0" />
      Deposit {toCurrency(status.depositCents)}: {toCurrency(status.outstandingCents)} still owed
      {due ? ` · ${overdue ? "was due" : "due"} ${due}` : ""}
    </p>
  )
}

/** The invoice totals as a receipt, with how much is paid and whether the deposit is in. */
const InvoiceSummaryCard: React.FC<{
  grandTotalCents: number
  paidCents: number
  balanceCents: number
  depositStatus: DepositStatus
}> = ({ grandTotalCents, paidCents, balanceCents, depositStatus }) => {
  const paidPercent = Math.round(computePaidFraction(paidCents, grandTotalCents) * 100)

  return (
    <FinancialCard title="Invoice Summary" description="What's billed, what's been paid and what's left.">
      <dl className="space-y-1.5">
        <SummaryRow label="Grand Total" value={toCurrency(grandTotalCents)} />
        <SummaryRow label="Payments Received" value={toCurrency(paidCents)} />
        <div className="border-t border-border pt-1.5">
          <SummaryRow label="Balance Remaining" value={toCurrency(balanceCents)} emphasis />
        </div>
      </dl>

      <div className="mt-3 space-y-1.5">
        <div
          role="progressbar"
          aria-label="Paid so far"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={paidPercent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${paidPercent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{paidPercent}% paid</p>
        <DepositStatusLine status={depositStatus} />
      </div>
    </FinancialCard>
  )
}

export default InvoiceSummaryCard
