import type { ReactNode } from "react"

// Fixed money columns, so every table on the page lines up and a range like
// "$13,859.80 – $13,859.80" fits on one line; the name column takes the rest and wraps.
const TOTAL_COLUMNS = "grid grid-cols-[minmax(0,1fr)_6.5rem_7.5rem_11.5rem] gap-x-3"
const PER_PERSON_COLUMNS = "grid grid-cols-[minmax(0,1fr)_11.5rem] gap-x-3"
const HEADER = "border-b border-dashed border-black pt-2 text-sm"
const MONEY = "whitespace-nowrap text-end tabular-nums"

export function ChargeTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className={`${TOTAL_COLUMNS} ${HEADER}`}>
        <p>{title}</p>
        <p className="text-end">Cost</p>
        <p className="text-end">Qty.</p>
        <p className="text-end">Total</p>
      </div>
      <div className={`${TOTAL_COLUMNS} gap-y-1 pt-2 text-sm`}>{children}</div>
    </div>
  )
}

function LineName({ name, note }: { name: string; note?: string | null }) {
  return (
    <div>
      <p className="font-bold">{name}</p>
      {note ? <p className="text-xs text-stone-600">{note}</p> : null}
    </div>
  )
}

/** One printed charge line. Cells come preformatted (see formatChargeRowCells). */
export function ChargeRow({
  name,
  note = null,
  cost,
  quantity,
  total,
}: {
  name: string
  /** A short line under the name, e.g. "Priced per person". */
  note?: string | null
  cost: string
  /** Null lets the cost run across the quantity column. */
  quantity: string | null
  total: string
}) {
  return (
    <>
      <LineName name={name} note={note} />
      {quantity == null ? (
        <p className={`col-span-2 ${MONEY}`}>{cost}</p>
      ) : (
        <>
          <p className={MONEY}>{cost}</p>
          <p className={MONEY}>{quantity}</p>
        </>
      )}
      <p className={MONEY}>{total}</p>
    </>
  )
}

/** A charge table as each guest's share: the line and one "Per Person" column. */
export function PerPersonChargeTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className={`${PER_PERSON_COLUMNS} ${HEADER}`}>
        <p>{title}</p>
        <p className="text-end">Per Person</p>
      </div>
      <div className={`${PER_PERSON_COLUMNS} gap-y-1 pt-2 text-sm`}>{children}</div>
    </div>
  )
}

/** One line as each guest's share (see formatPerPersonLineCells). */
export function PerPersonChargeRow({ name, note, value }: { name: string; note: string | null; value: string }) {
  return (
    <>
      <LineName name={name} note={note} />
      <p className={MONEY}>{value}</p>
    </>
  )
}
