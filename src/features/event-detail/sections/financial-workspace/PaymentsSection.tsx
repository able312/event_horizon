import React, { useEffect, useRef } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"

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
import FinancialCard, { FINANCIAL_EMPTY_STATE_CLASS } from "./FinancialCard"

function focusNextCell(rowId: string, currentCellIndex: number) {
  const rowCells = document.querySelectorAll<HTMLElement>(`[data-payment-row-id="${rowId}"] [data-cell]`)
  const nextCell = rowCells[currentCellIndex + 1]

  if (nextCell) {
    nextCell.focus()
  }
}

interface PaymentsSectionProps {
  className?: string
}

const PaymentsSection: React.FC<PaymentsSectionProps> = ({ className }) => {
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
    <FinancialCard
      className={className}
      title="Payments"
      description="Deposits and payments received for this event."
      actions={
        <Button type="button" variant="outline" className="h-8 rounded-xs px-2 text-sm" onClick={handleAddPayment}>
          <Plus className="size-3.5" />
          Add Payment
        </Button>
      }
      footer={!isLoading && rows.length > 0 ? `Payments Total: ${toCurrency(paymentsTotalCents)}` : undefined}
    >
      {isLoading ? <p className="text-xs text-muted-foreground">Loading payments…</p> : null}

      {!isLoading && rows.length === 0 ? (
        <div className={FINANCIAL_EMPTY_STATE_CLASS}>No payments recorded yet.</div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className={SECTION_TABLE_CONTAINER_CLASS}>
          <table className={`${SECTION_TABLE_CLASS} table-fixed tabular-nums`} data-payments-table="true">
            <colgroup>
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-28" />
              <col />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Date</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Amount ($)</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Receipt #</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Notes</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}><span className="sr-only">Actions</span></th>
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
          </table>
        </div>
      ) : null}
    </FinancialCard>
  )
}

export default PaymentsSection
