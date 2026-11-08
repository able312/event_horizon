import React from "react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  getPackagePricePerPersonCents,
  getPackageQuantity,
  needsPackageQuantity,
  toCurrency,
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
import FinancialCard from "./FinancialCard"

const CELL_INPUT_CLASS =
  "ml-auto block h-7 w-20 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"

/** Reads a typed quantity: blank clears it (null); otherwise a whole number, 0 or more. */
function parseQuantity(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const quantity = Math.floor(Number(trimmed))
  return Number.isFinite(quantity) ? Math.max(0, quantity) : null
}

/**
 * The final quantity each priced package is billed for on the invoice. Only food timeblocks
 * with a package price (set in the Estimate section) are listed; nothing shows without one.
 */
const InvoicePackageQuantities: React.FC<{
  timeblocks: TimeblockWithItems[]
  onUpdateQuantity: (payload: { timeblockId: string; packageQuantity: number | null }) => void
}> = ({ timeblocks, onUpdateQuantity }) => {
  const priced = timeblocks.filter((timeblock) => getPackagePricePerPersonCents(timeblock) != null)
  if (priced.length === 0) return null
  const missing = priced.filter(needsPackageQuantity)

  return (
    <FinancialCard
      title="Package Quantities"
      description="The invoice bills each package price × the final quantity here, in place of the dishes it covers. Fixed-price items like platters bill their own quantity × price."
    >
      <div className="space-y-2">
        {missing.length > 0 ? (
          <p role="alert" className="rounded-xs border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
            Needs a final quantity before invoicing: {missing.map((timeblock) => timeblock.title || "Untitled").join(", ")}.
            Until then the invoice bills nothing for {missing.length === 1 ? "it" : "them"}.
          </p>
        ) : null}

        <div className={SECTION_TABLE_CONTAINER_CLASS}>
          <table className={`${SECTION_TABLE_CLASS} table-fixed tabular-nums`}>
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Package</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Price / person</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Final qty</th>
                <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {priced.map((timeblock) => {
                const price = getPackagePricePerPersonCents(timeblock) ?? 0
                const quantity = getPackageQuantity(timeblock)
                return (
                  <tr key={timeblock.id} className={SECTION_TABLE_BODY_ROW_CLASS}>
                    <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-xs`}>{timeblock.title || "Untitled"}</td>
                    <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right text-xs`}>{toCurrency(price)}</td>
                    <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
                      <input
                        key={quantity ?? "unset"}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Set"
                        defaultValue={quantity ?? ""}
                        onBlur={(e) => {
                          const next = parseQuantity(e.target.value)
                          if (next !== quantity) onUpdateQuantity({ timeblockId: timeblock.id, packageQuantity: next })
                        }}
                        className={CELL_INPUT_CLASS}
                        aria-label={`${timeblock.title} Final quantity`}
                      />
                    </td>
                    <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right text-xs font-medium`}>
                      {quantity == null ? (
                        <span className="text-amber-700">Needs final qty</span>
                      ) : (
                        toCurrency(price * quantity)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </FinancialCard>
  )
}

export default InvoicePackageQuantities
