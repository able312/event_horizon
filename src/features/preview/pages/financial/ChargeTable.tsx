import type { ReactNode } from "react"

import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
} from "~/features/preview/preferences/selectors"

export function ChargeTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="grid grid-cols-6 border-b border-dashed border-black pt-2 text-sm">
        <p className="col-span-3">{title}</p>
        <p className="col-span-1 text-end">Cost</p>
        <p className="col-span-1 text-end">Qty.</p>
        <p className="col-span-1 text-end">Total</p>
      </div>
      <div className="grid grid-cols-6 pt-2 text-sm">{children}</div>
    </div>
  )
}

export function ChargeRow({
  name,
  unitPriceCents,
  quantity,
  totalCents,
}: {
  name: string
  unitPriceCents: number | null | undefined
  quantity: number | null | undefined
  totalCents: number
}) {
  return (
    <>
      <p className="col-span-3 font-bold">{name}</p>
      <p className="col-span-1 text-end">{formatPreviewPrice(unitPriceCents, toCurrency)}</p>
      <p className="col-span-1 text-end">{formatPreviewQuantity(quantity)}</p>
      <p className="col-span-1 text-end">
        {totalCents > 0 ? toCurrency(totalCents) : ""}
      </p>
    </>
  )
}
