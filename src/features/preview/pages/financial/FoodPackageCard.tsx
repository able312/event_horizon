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
import { formatPerPersonLineCells, toChargeLine } from "./chargeTables"

const ITEM_COLUMNS = "grid grid-cols-[minmax(0,1fr)_6.5rem_7.5rem_11.5rem] gap-x-3"
const PER_PERSON_ITEM_COLUMNS = "grid grid-cols-[minmax(0,1fr)_11.5rem] gap-x-3"
const MONEY = "whitespace-nowrap text-end tabular-nums"

/**
 * One package on the Food Packages page: items, then its pricing as a package total, per
 * person, or both, following the estimate's pricing views. Per person needs a guest count;
 * without one the package total shows instead.
 */
export function FoodPackageCard({
  summary,
  timeblock,
  showTotal,
  showPerPerson,
}: {
  summary: FoodPackageSummary
  timeblock: TimeblockWithItems | undefined
  showTotal: boolean
  showPerPerson: boolean
}) {
  const items = timeblock?.foodItems ?? []
  const guests = summary.perPerson?.guests ?? null
  const packagePrice = summary.packagePricePerPersonCents
  const perPerson = showPerPerson ? summary.perPerson : null
  const showPackageTotal = showTotal || !perPerson
  // Items read as each guest's share only when that is the card's sole view.
  const perPersonItems = perPerson != null && !showPackageTotal && guests != null

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
          <div
            className={`${perPersonItems ? PER_PERSON_ITEM_COLUMNS : ITEM_COLUMNS} border-b border-dashed border-stone-400 py-1 text-[10px] uppercase tracking-wide text-stone-500`}
          >
            <span>Item</span>
            {perPersonItems ? (
              <span className="text-end">Per person</span>
            ) : (
              <>
                <span className="text-end">Cost</span>
                <span className="text-end">Qty.</span>
                <span className="text-end">Total</span>
              </>
            )}
          </div>
          {items.map((item) => {
            const included = timeblock ? isCoveredByPackagePrice(timeblock, item) : false
            const fixedPrice = packagePrice != null && getPricingBasis(item) === "each"
            const line = toChargeLine(item, guests)
            const perPersonCells = perPersonItems && guests ? formatPerPersonLineCells(line, guests) : null
            const note = perPersonCells?.note ?? (fixedPrice ? "Fixed price, regardless of guest count" : null)
            return (
              <div
                key={item.id}
                className={`${perPersonItems ? PER_PERSON_ITEM_COLUMNS : ITEM_COLUMNS} border-b border-dashed border-stone-200 py-1 text-sm last:border-b-0`}
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {note && !included ? <p className="text-xs text-stone-600">{note}</p> : null}
                  {hasText(item.clientNotes) ? (
                    <pre className="mt-0.5 whitespace-pre-wrap font-sans text-xs text-stone-600">{item.clientNotes}</pre>
                  ) : null}
                </div>
                {included ? (
                  <p className={`${perPersonItems ? "" : "col-span-3"} text-end`}>Included</p>
                ) : perPersonCells ? (
                  <p className={MONEY}>{perPersonCells.value}</p>
                ) : (
                  <>
                    <p className={MONEY}>{line.cells.cost}</p>
                    <p className={MONEY}>{line.cells.quantity}</p>
                    <p className={MONEY}>{line.cells.total}</p>
                  </>
                )}
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
        <span className="text-end text-xs uppercase tracking-wide text-stone-500">
          {showPackageTotal ? "Package total" : ""}
        </span>
        <BreakdownRow label="Subtotal" summary={summary} perPerson={perPerson} showTotal={showPackageTotal} pick={(b) => b.subtotalCents} />
        <BreakdownRow
          label={`HST (${Math.round(HST_RATE * 100)}%)`}
          summary={summary}
          perPerson={perPerson}
          showTotal={showPackageTotal}
          pick={(b) => b.hstCents}
        />
        <BreakdownRow
          label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
          summary={summary}
          perPerson={perPerson}
          showTotal={showPackageTotal}
          pick={(b) => b.gratuityCents}
        />
        <BreakdownRow
          label="Total"
          summary={summary}
          perPerson={perPerson}
          showTotal={showPackageTotal}
          pick={(b) => b.totalCents}
          emphasis
        />
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
  showTotal,
  pick,
  emphasis = false,
}: {
  label: string
  summary: FoodPackageSummary
  perPerson: PerPersonPricing | null
  showTotal: boolean
  pick: (breakdown: ChargeBreakdown) => number
  emphasis?: boolean
}) {
  const valueClass = `${MONEY}${emphasis ? " font-semibold" : ""}`
  return (
    <>
      <span className="text-stone-600">{label}</span>
      <span className={valueClass}>{perPerson ? formatPerPerson(perPerson, pick) : ""}</span>
      <span className={valueClass}>
        {showTotal ? formatCurrencyRange(pick(summary.totals.low), pick(summary.totals.high)) : ""}
      </span>
    </>
  )
}

function formatPerPerson(perPerson: PerPersonPricing, pick: (breakdown: ChargeBreakdown) => number): string {
  return formatCurrencyRange(pick(perPerson.atMaxGuests), pick(perPerson.atMinGuests))
}
