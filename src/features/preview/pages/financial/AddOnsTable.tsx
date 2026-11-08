import type { EstimateAddOn } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { formatAddOnCells } from "~/features/preview/lib/addOnRows"
import type { GuestCountRange } from "~/features/preview/lib/foodPackages"

/** Optional add-ons, offered beside the estimate and left out of its totals. */
export function AddOnsTable({ addOns, guests }: { addOns: EstimateAddOn[]; guests: GuestCountRange | null }) {
  return (
    <div>
      <div className="grid grid-cols-6 border-b border-dashed border-black pt-2 text-sm">
        <p className="col-span-3">Optional Add-ons</p>
        <p className="col-span-2 text-end">Price</p>
        <p className="col-span-1 text-end">Total</p>
      </div>
      <div className="grid grid-cols-6 pt-2 text-sm">
        {addOns.map((addOn) => {
          const cells = formatAddOnCells(addOn, guests)
          return (
            <div key={addOn.key} className="col-span-6 grid grid-cols-6">
              <div className="col-span-3">
                <p className="font-bold">{addOn.name}</p>
                {addOn.includes.length > 0 ? (
                  <p className="text-xs text-stone-600">Includes {addOn.includes.join(", ")}</p>
                ) : null}
              </div>
              <p className="col-span-2 text-end">{cells.price}</p>
              <p className="col-span-1 text-end">{cells.total}</p>
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-xs italic text-stone-600">
        Not included in the total. Prices are before HST and gratuity.
      </p>
    </div>
  )
}
