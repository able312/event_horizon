import React, { useEffect, useRef } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { Payment } from "~/definitions/database"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import {
  computePaymentsTotalCents,
  dollarsToCents,
  fromDateInputValue,
  toCurrency,
  toDateInputValue,
} from "~/features/event-detail/workspace/lib/financial"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "../../../../components/event-detail/detail-sections/sections/tableStyles"

function focusNextCell(rowId: string, currentCellIndex: number) {
  const rowCells = document.querySelectorAll<HTMLElement>(`[data-payment-row-id="${rowId}"] [data-cell]`)
  const nextCell = rowCells[currentCellIndex + 1]

  if (nextCell) {
    nextCell.focus()
  }
}

interface PaymentsSectionProps {
  className?: string
  emptyStateMode?: "default" | "workspace"
  onGenerateEstimate?: () => void
}

const PaymentsSection: React.FC<PaymentsSectionProps> = ({
  className,
  emptyStateMode = "default",
  onGenerateEstimate,
}) => {
  const {
    data: payments,
    isLoading,
    createPaymentAsync,
    updatePayment,
    deletePaymentAsync,
  } = usePaymentsSection()

  const focusNewRowRef = useRef(false)
  const [amountDrafts, setAmountDrafts] = React.useState<Record<string, string>>({})
  const [editingAmountId, setEditingAmountId] = React.useState<string | null>(null)

  useEffect(() => {
    if (!focusNewRowRef.current) return
    focusNewRowRef.current = false

    const firstInput = document.querySelector<HTMLInputElement>('[data-payments-table="true"] [data-cell="date"]')
    firstInput?.focus()
  }, [payments])

  useEffect(() => {
    const rows = payments ?? []
    setAmountDrafts((prev) => {
      const next: Record<string, string> = {}
      for (const payment of rows) {
        if (editingAmountId === payment.id && prev[payment.id] != null) {
          next[payment.id] = prev[payment.id]
        } else {
          next[payment.id] = ((payment.amountCents ?? 0) / 100).toFixed(2)
        }
      }
      return next
    })
  }, [payments, editingAmountId])

  const handleUpdateField = (id: string, field: "amountCents" | "date" | "recieptNumber" | "notes", value: string) => {
    if (field === "amountCents") {
      updatePayment({ id, updates: { amountCents: dollarsToCents(value) } })
      return
    }

    if (field === "date") {
      updatePayment({ id, updates: { date: fromDateInputValue(value) } })
      return
    }

    updatePayment({ id, updates: { [field]: value } })
  }

  const handleAddPayment = async () => {
    focusNewRowRef.current = true
    await createPaymentAsync()
  }

  const handleDelete = async (payment: Payment) => {
    await deletePaymentAsync(payment.id)

    toast("Payment deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const restored = await createPaymentAsync()
          updatePayment({
            id: restored.id,
            updates: {
              amountCents: payment.amountCents,
              date: payment.date,
              recieptNumber: payment.recieptNumber,
              notes: payment.notes,
            },
          })
        },
      },
    })
  }

  const rows = payments ?? []
  const paymentsTotalCents = computePaymentsTotalCents(rows)

  return (
    <section className={className}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-semibold tracking-wide">Payments</h3>
        <button
          type="button"
          onClick={handleAddPayment}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus size={14} />
          Add Payment
        </button>
      </div>

      {isLoading ? <p className="pt-4 text-sm text-muted-foreground">Loading payments...</p> : null}

      {!isLoading && rows.length === 0 ? (
        emptyStateMode === "workspace" ? (
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Would you like to create an estimate?
            </p>
            <button
              type="button"
              onClick={onGenerateEstimate}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Generate Estimate
            </button>
          </div>
        ) : (
          <p className="pt-4 text-sm text-muted-foreground">No payments recorded yet.</p>
        )
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className={SECTION_TABLE_CONTAINER_CLASS}>
          <table className={`${SECTION_TABLE_CLASS} table-fixed`} data-payments-table="true">
            <colgroup>
              <col className="w-30" />
              <col className="w-22" />
              <col className="w-22" />
              <col />
              <col className="w-11" />
            </colgroup>
            <thead>
              <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Date</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Amount ($)</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Receipt #</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Notes</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr className={SECTION_TABLE_BODY_ROW_CLASS} key={payment.id} data-payment-row-id={payment.id}>
                  <td className={SECTION_TABLE_BODY_CELL_CLASS}>
                    <input
                      data-cell="date"
                      type="date"
                      defaultValue={toDateInputValue(payment.date)}
                      onBlur={(e) => handleUpdateField(payment.id, "date", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          ;(e.currentTarget as HTMLInputElement).blur()
                          focusNextCell(payment.id, 0)
                        }
                      }}
                      className="h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </td>

                  <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
                    <input
                      data-cell
                      type="text"
                      inputMode="decimal"
                      value={amountDrafts[payment.id] ?? ((payment.amountCents ?? 0) / 100).toFixed(2)}
                      onChange={(e) => {
                        setAmountDrafts((prev) => ({ ...prev, [payment.id]: e.target.value }))
                      }}
                      onFocus={() => {
                        setEditingAmountId(payment.id)
                        setAmountDrafts((prev) => ({
                          ...prev,
                          [payment.id]: prev[payment.id] ?? ((payment.amountCents ?? 0) / 100).toFixed(2),
                        }))
                      }}
                      onBlur={(e) => {
                        const cents = Math.max(0, dollarsToCents(e.target.value))
                        setEditingAmountId((current) => (current === payment.id ? null : current))
                        setAmountDrafts((prev) => ({
                          ...prev,
                          [payment.id]: (cents / 100).toFixed(2),
                        }))
                        handleUpdateField(payment.id, "amountCents", (cents / 100).toString())
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          ;(e.currentTarget as HTMLInputElement).blur()
                          focusNextCell(payment.id, 1)
                        }
                      }}
                      className="ml-auto h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-right text-xs focus:border-primary focus:outline-none"
                    />
                  </td>

                  <td className={SECTION_TABLE_BODY_CELL_CLASS}>
                    <input
                      data-cell
                      type="text"
                      defaultValue={payment.recieptNumber ?? ""}
                      placeholder="Receipt #"
                      onBlur={(e) => handleUpdateField(payment.id, "recieptNumber", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          ;(e.currentTarget as HTMLInputElement).blur()
                          focusNextCell(payment.id, 2)
                        }
                      }}
                      className="h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </td>

                  <td className={SECTION_TABLE_BODY_CELL_CLASS}>
                    <input
                      data-cell
                      type="text"
                      defaultValue={payment.notes ?? ""}
                      placeholder="Notes"
                      onBlur={(e) => handleUpdateField(payment.id, "notes", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          ;(e.currentTarget as HTMLInputElement).blur()
                        }
                      }}
                      className="h-7 w-full border-0 border-b border-border bg-transparent px-0.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </td>

                  <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      onClick={() => handleDelete(payment)}
                      title="Delete payment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-1.5 py-2 text-right text-xs font-medium text-foreground">
                  Payments Total: {toCurrency(paymentsTotalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export default PaymentsSection
