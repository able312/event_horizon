import type { ReactNode } from "react"

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

/** One printed charge line. Cells come preformatted (see formatChargeRowCells). */
export function ChargeRow({
  name,
  cost,
  quantity,
  total,
}: {
  name: string
  cost: string
  /** Null lets the cost run across the quantity column, for a per-person rate. */
  quantity: string | null
  total: string
}) {
  return (
    <>
      <p className="col-span-3 font-bold">{name}</p>
      {quantity == null ? (
        <p className="col-span-2 text-end">{cost}</p>
      ) : (
        <>
          <p className="col-span-1 text-end">{cost}</p>
          <p className="col-span-1 text-end">{quantity}</p>
        </>
      )}
      <p className="col-span-1 text-end">{total}</p>
    </>
  )
}
