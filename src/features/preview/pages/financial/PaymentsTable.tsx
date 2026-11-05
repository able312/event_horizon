import type { Payment } from "~/definitions/database"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { formatDate } from "~/lib/formatters"

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <div>
      <h2 className="text-sm">Payments Made</h2>
      <div className="grid grid-cols-4 border-b border-stone-400 py-2 text-xs text-stone-400">
        <p>Date</p>
        <p>For</p>
        <p>Amount</p>
        <p>Receipt No.</p>
      </div>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="grid grid-cols-4 border-b border-dashed border-stone-400 py-2 text-sm"
        >
          <p>{formatDate(payment.date)}</p>
          <p>{payment.notes}</p>
          <p>{toCurrency(payment.amountCents ?? 0)}</p>
          <p>{payment.recieptNumber}</p>
        </div>
      ))}
    </div>
  )
}
