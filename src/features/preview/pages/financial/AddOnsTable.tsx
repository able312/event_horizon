import type { EstimateAddOn } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { formatAddOnCells } from "~/features/preview/lib/addOnRows"
import type { GuestCountRange } from "~/features/preview/lib/foodPackages"

const MONEY = "whitespace-nowrap text-end tabular-nums"

/**
 * Optional add-ons, offered beside the estimate. The grand total's high end counts them all
 * and its low end none. Shows a Total column, a Per Person column, or both, following the
 * estimate's pricing views.
 */
export function AddOnsTable({
  addOns,
  guests,
  showTotal,
  showPerPerson,
}: {
  addOns: EstimateAddOn[]
  guests: GuestCountRange | null
  showTotal: boolean
  showPerPerson: boolean
}) {
  const perPersonColumn = showPerPerson && guests != null
  const columns = 2 + (showTotal ? 1 : 0) + (perPersonColumn ? 1 : 0)
  const grid = `grid gap-x-3 ${GRID_COLUMNS[columns]}`

  return (
    <div>
      <div className={`${grid} border-b border-dashed border-black pt-2 text-sm`}>
        <p>Optional Add-ons</p>
        <p className="text-end">Price</p>
        {showTotal ? <p className="text-end">Total</p> : null}
        {perPersonColumn ? <p className="text-end">Per Person</p> : null}
      </div>
      <div className={`${grid} gap-y-1 pt-2 text-sm`}>
        {addOns.map((addOn) => {
          const cells = formatAddOnCells(addOn, guests)
          return (
            <div key={addOn.key} className="contents">
              <div>
                <p className="font-bold">{addOn.name}</p>
                {addOn.includes.length > 0 ? (
                  <p className="text-xs text-stone-600">Includes {addOn.includes.join(", ")}</p>
                ) : null}
              </div>
              <p className="text-end tabular-nums">{cells.price}</p>
              {showTotal ? <p className={MONEY}>{cells.total}</p> : null}
              {perPersonColumn ? <p className={MONEY}>{cells.perPerson}</p> : null}
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-xs italic text-stone-600">
        Optional. The low end of the estimate leaves these out and the high end includes them all.
        Prices are before HST and gratuity.
      </p>
    </div>
  )
}

// Fixed columns so the header and rows line up. Totals never wrap; a long price like
// "$9.00 per person + $100.00" may.
const GRID_COLUMNS: Record<number, string> = {
  2: "grid-cols-[minmax(0,1fr)_13rem]",
  3: "grid-cols-[minmax(0,1fr)_13rem_11.5rem]",
  4: "grid-cols-[minmax(0,1fr)_9rem_11.5rem_8.5rem]",
}
