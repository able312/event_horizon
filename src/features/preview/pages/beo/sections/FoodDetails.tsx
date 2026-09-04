import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
  sortTimeblocksByTime,
} from "~/features/preview/preferences/selectors"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

type FoodTimeblockDetailsProps = {
  timeblock: TimeblockWithItems
  showPricing?: boolean
}

export function FoodTimeblockDetails({
  timeblock,
  showPricing = false,
}: FoodTimeblockDetailsProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="border border-stone-200 bg-stone-50 px-2 py-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-sm font-bold text-stone-800">{timeblock.title}</h3>
          <div className="flex flex-wrap gap-x-4 text-xs text-stone-600">
            {timeblock.time ? <span>Time: {timeblock.time}</span> : null}
            {timeblock.assignedTo ? <span>Assigned: {timeblock.assignedTo}</span> : null}
          </div>
        </div>
        {timeblock.details?.trim() ? (
          <div className="mt-2 border-t border-stone-200 pt-2 text-sm">
            <PreviewMarkdownContent source={timeblock.details} />
          </div>
        ) : null}
      </div>

      {(timeblock.foodItems?.length ?? 0) > 0 ? (
        <div className="mt-1 border border-t-0 border-stone-200">
          <div
            className={`grid gap-x-3 border-b border-dashed border-stone-300 bg-stone-50 px-2 py-1 text-[10px] uppercase tracking-wide text-stone-500 ${
              showPricing
                ? "grid-cols-[minmax(0,2fr)_1fr_auto_auto_auto]"
                : "grid-cols-[minmax(0,2fr)_1fr_auto]"
            }`}
          >
            <span>Item</span>
            <span>Service</span>
            <span className="text-end">Qty</span>
            {showPricing ? (
              <>
                <span className="text-end">Price</span>
                <span className="text-end">Total</span>
              </>
            ) : null}
          </div>

          {timeblock.foodItems?.map((food) => {
            const qty = formatPreviewQuantity(food.quantity)
            const price = formatPreviewPrice(food.unitPriceCents, toCurrency)
            const lineTotal =
              (food.quantity ?? 0) > 0 && (food.unitPriceCents ?? 0) > 0
                ? toCurrency((food.quantity ?? 0) * (food.unitPriceCents ?? 0))
                : ""

            return (
              <div
                key={food.id}
                className="border-b border-dashed border-stone-200 px-2 py-1.5 last:border-b-0"
              >
                <div
                  className={`grid items-baseline gap-x-3 text-sm ${
                    showPricing
                      ? "grid-cols-[minmax(0,2fr)_1fr_auto_auto_auto]"
                      : "grid-cols-[minmax(0,2fr)_1fr_auto]"
                  }`}
                >
                  <p className="font-semibold">{food.name}</p>
                  <p>{food.serviceStyle ?? ""}</p>
                  <p className="text-end tabular-nums">{qty}</p>
                  {showPricing ? (
                    <>
                      <p className="text-end tabular-nums">{price}</p>
                      <p className="text-end tabular-nums">{lineTotal}</p>
                    </>
                  ) : null}
                </div>
                {food.includes?.trim() ? (
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-stone-600">
                    {food.includes}
                  </pre>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

type FoodDetailsProps = {
  timeblocks?: TimeblockWithItems[] | null
  selectedIds?: string[]
  showPricing?: boolean
}

export const FoodDetails = ({
  timeblocks,
  selectedIds,
  showPricing = false,
}: FoodDetailsProps) => {
  const selectedSet = selectedIds ? new Set(selectedIds) : null
  const sorted = sortTimeblocksByTime(timeblocks).filter((tb) =>
    selectedSet ? selectedSet.has(tb.id) : true,
  )

  if (sorted.length === 0) return null

  return (
    <>
      {sorted.map((timeblock) => (
        <FoodTimeblockDetails
          key={timeblock.id}
          timeblock={timeblock}
          showPricing={showPricing}
        />
      ))}
    </>
  )
}
