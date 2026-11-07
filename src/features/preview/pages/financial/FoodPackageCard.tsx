import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  GRATUITY_RATE,
  HST_RATE,
  getPricingBasis,
  isCoveredByPackagePrice,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import {
  formatCurrencyRange,
  formatGuestCountRange,
  type ChargeBreakdown,
  type FoodPackageSummary,
  type PerPersonPricing,
} from "~/features/preview/lib/foodPackages"
import { hasText } from "~/lib/utils"
import { formatChargeRowCells } from "./chargeTables"

/** One package on the Food Packages page: items, then per-person and whole-package pricing. */
export function FoodPackageCard({
  summary,
  timeblock,
}: {
  summary: FoodPackageSummary
  timeblock: TimeblockWithItems | undefined
}) {
  const items = timeblock?.foodItems ?? []
  const guests = summary.perPerson?.guests ?? null
  const packagePrice = summary.packagePricePerPersonCents
  // With a package price, the price is quoted as set: no per-head figure derived from the total,
  // which would shift with the guest count.
  const perPerson = packagePrice == null ? summary.perPerson : null

  return (
    <div className="border border-stone-300">
      <div className="flex items-baseline justify-between gap-4 border-b border-stone-300 bg-stone-50 px-2 py-1.5">
        <h3 className="text-sm font-bold">{summary.title}</h3>
        {packagePrice != null ? (
          <p className="text-sm font-semibold tabular-nums">
            {toCurrency(packagePrice)} per person{summary.eachSubtotalCents > 0 ? " + fixed-price items" : ""}
          </p>
        ) : perPerson ? (
          <p className="text-sm font-semibold tabular-nums">
            {formatPerPerson(perPerson, (b) => b.totalCents)} per person
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="px-2 pt-1">
          <div className="grid grid-cols-6 border-b border-dashed border-stone-400 py-1 text-[10px] uppercase tracking-wide text-stone-500">
            <span className="col-span-3">Item</span>
            <span className="text-end">Cost</span>
            <span className="text-end">Qty.</span>
            <span className="text-end">Total</span>
          </div>
          {items.map((item) => {
            const included = timeblock ? isCoveredByPackagePrice(timeblock, item) : false
            const fixedPrice = packagePrice != null && getPricingBasis(item) === "each"
            const cells = included
              ? { cost: "Included", quantity: null, total: "" }
              : formatChargeRowCells(item, guests)
            return (
              <div key={item.id} className="grid grid-cols-6 border-b border-dashed border-stone-200 py-1 text-sm last:border-b-0">
                <div className="col-span-3">
                  <p className="font-semibold">{item.name}</p>
                  {fixedPrice ? (
                    <p className="text-xs text-stone-600">Fixed price, regardless of guest count</p>
                  ) : null}
                  {hasText(item.clientNotes) ? (
                    <pre className="mt-0.5 whitespace-pre-wrap font-sans text-xs text-stone-600">{item.clientNotes}</pre>
                  ) : null}
                </div>
                {cells.quantity == null ? (
                  <p className="col-span-2 text-end tabular-nums">{cells.cost}</p>
                ) : (
                  <>
                    <p className="text-end tabular-nums">{cells.cost}</p>
                    <p className="text-end tabular-nums">{cells.quantity}</p>
                  </>
                )}
                <p className="text-end tabular-nums">{cells.total}</p>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-0.5 border-t border-stone-300 px-2 py-2 text-sm">
        <span />
        <span className="text-end text-xs uppercase tracking-wide text-stone-500">
          {perPerson ? `Per person (${formatGuestCountRange(perPerson.guests)})` : ""}
        </span>
        <span className="text-end text-xs uppercase tracking-wide text-stone-500">Package total</span>
        <BreakdownRow label="Subtotal" summary={summary} perPerson={perPerson} pick={(b) => b.subtotalCents} />
        <BreakdownRow
          label={`HST (${Math.round(HST_RATE * 100)}%)`}
          summary={summary}
          perPerson={perPerson}
          pick={(b) => b.hstCents}
        />
        <BreakdownRow
          label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
          summary={summary}
          perPerson={perPerson}
          pick={(b) => b.gratuityCents}
        />
        <BreakdownRow label="Total" summary={summary} perPerson={perPerson} pick={(b) => b.totalCents} emphasis />
      </div>

      {summary.unpricedItemNames.length > 0 ? (
        <p className="border-t border-dashed border-stone-300 px-2 py-1 text-xs italic text-stone-500">
          Not included in the price (no quantity or price yet): {summary.unpricedItemNames.join(", ")}
        </p>
      ) : null}

      {!summary.perPerson && summary.perPersonRateCents > 0 ? (
        <p className="border-t border-dashed border-stone-300 px-2 py-1 text-xs italic text-stone-500">
          Items priced per person are not included in the price until the event has a guest count.
        </p>
      ) : null}
    </div>
  )
}

function BreakdownRow({
  label,
  summary,
  perPerson,
  pick,
  emphasis = false,
}: {
  label: string
  summary: FoodPackageSummary
  perPerson: PerPersonPricing | null
  pick: (breakdown: ChargeBreakdown) => number
  emphasis?: boolean
}) {
  const valueClass = emphasis ? "text-end font-semibold tabular-nums" : "text-end tabular-nums"
  return (
    <>
      <span className="text-stone-600">{label}</span>
      <span className={valueClass}>{perPerson ? formatPerPerson(perPerson, pick) : ""}</span>
      <span className={valueClass}>{formatCurrencyRange(pick(summary.totals.low), pick(summary.totals.high))}</span>
    </>
  )
}

function formatPerPerson(perPerson: PerPersonPricing, pick: (breakdown: ChargeBreakdown) => number): string {
  return formatCurrencyRange(pick(perPerson.atMaxGuests), pick(perPerson.atMinGuests))
}
