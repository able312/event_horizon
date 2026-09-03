import type { BeverageItem } from "~/definitions/database"
import type { Timeblock } from "~/definitions/database"
import {
  getVisibleBeverageTypeSections,
} from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
  sortTimeblocksByTime,
} from "~/features/preview/preferences/selectors"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

type BeverageDetailsProps = {
  timeblocks?: Timeblock[] | null
  items?: BeverageItem[] | null
  selectedTimeblockIds?: string[]
  showPricing?: boolean
}

export const BeverageDetails = ({
  timeblocks = [],
  items = [],
  selectedTimeblockIds,
  showPricing = false,
}: BeverageDetailsProps) => {
  const selectedSet = selectedTimeblockIds ? new Set(selectedTimeblockIds) : null
  const sortedTimeblocks = sortTimeblocksByTime(timeblocks).filter((tb) =>
    selectedSet ? selectedSet.has(tb.id) : true,
  )

  const typeSections = getVisibleBeverageTypeSections(items ?? [], {
    hideEmptySpecialOrders: true,
  }).filter((section) => section.items.length > 0)

  const hasTimeblocks = sortedTimeblocks.length > 0
  const hasBarList = typeSections.length > 0

  if (!hasTimeblocks && !hasBarList) return null

  return (
    <>
      {sortedTimeblocks.map((timeblock) => (
        <div key={timeblock.id} className="mb-3 border-b border-stone-200 pb-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-bold">{timeblock.title}</h3>
            <div className="flex flex-wrap gap-x-4 text-xs text-stone-600">
              {timeblock.time ? <span>Time: {timeblock.time}</span> : null}
              {timeblock.assignedTo ? <span>Assigned: {timeblock.assignedTo}</span> : null}
            </div>
          </div>
          {timeblock.details?.trim() ? (
            <div className="mt-2 text-sm">
              <PreviewMarkdownContent source={timeblock.details} />
            </div>
          ) : null}
        </div>
      ))}

      {hasBarList ? (
        <div className={hasTimeblocks ? "mt-4" : undefined}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Event Bar List
          </h3>
          {typeSections.map((section) => (
            <div key={section.type} className="mb-3">
              <p className="mb-1 bg-stone-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-600">
                {section.type}
              </p>
              <div
                className={`grid gap-x-3 border-b border-dashed border-stone-300 px-2 py-1 text-[10px] uppercase tracking-wide text-stone-500 ${
                  showPricing
                    ? "grid-cols-[minmax(0,2fr)_auto_auto_auto]"
                    : "grid-cols-[minmax(0,2fr)_auto]"
                }`}
              >
                <span>Item</span>
                <span className="text-end">Qty</span>
                {showPricing ? (
                  <>
                    <span className="text-end">Price</span>
                    <span className="text-end">Total</span>
                  </>
                ) : null}
              </div>
              {section.items.map((item) => {
                const qty = formatPreviewQuantity(item.quantity)
                const price = formatPreviewPrice(item.unitPriceCents, toCurrency)
                const lineTotal =
                  (item.quantity ?? 0) > 0 && (item.unitPriceCents ?? 0) > 0
                    ? toCurrency((item.quantity ?? 0) * (item.unitPriceCents ?? 0))
                    : ""

                return (
                  <div
                    key={item.id}
                    className="border-b border-dashed border-stone-200 px-2 py-1.5 last:border-b-0"
                  >
                    <div
                      className={`grid items-baseline gap-x-3 text-sm ${
                        showPricing
                          ? "grid-cols-[minmax(0,2fr)_auto_auto_auto]"
                          : "grid-cols-[minmax(0,2fr)_auto]"
                      }`}
                    >
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-end tabular-nums">{qty}</p>
                      {showPricing ? (
                        <>
                          <p className="text-end tabular-nums">{price}</p>
                          <p className="text-end tabular-nums">{lineTotal}</p>
                        </>
                      ) : null}
                    </div>
                    {item.includes?.trim() ? (
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-stone-600">
                        {item.includes}
                      </pre>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
