import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { GRATUITY_RATE, HST_RATE, toCurrency } from "~/features/event-detail/workspace/lib/financial"
import {
  formatCurrencyRange,
  type ChargeBreakdown,
  type FoodPackageSummary,
  type PerPersonPricing,
} from "~/features/preview/lib/foodPackages"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
  isBillableLineItem,
} from "~/features/preview/preferences/selectors"
import { hasText } from "~/lib/utils"

/** One package on the Food Packages page: items, then per-person and whole-package pricing. */
export function FoodPackageCard({
  summary,
  timeblock,
}: {
  summary: FoodPackageSummary
  timeblock: TimeblockWithItems | undefined
}) {
  const items = timeblock?.foodItems ?? []

  return (
    <div className="border border-stone-300">
      <div className="flex items-baseline justify-between gap-4 border-b border-stone-300 bg-stone-50 px-2 py-1.5">
        <h3 className="text-sm font-bold">{summary.title}</h3>
        {summary.perPerson ? (
          <p className="text-sm font-semibold tabular-nums">
            {formatPerPerson(summary.perPerson, (b) => b.totalCents)} per person
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
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-6 border-b border-dashed border-stone-200 py-1 text-sm last:border-b-0">
              <div className="col-span-3">
                <p className="font-semibold">{item.name}</p>
                {hasText(item.clientNotes) ? (
                  <pre className="mt-0.5 whitespace-pre-wrap font-sans text-xs text-stone-600">{item.clientNotes}</pre>
                ) : null}
              </div>
              <p className="text-end tabular-nums">{formatPreviewPrice(item.unitPriceCents, toCurrency)}</p>
              <p className="text-end tabular-nums">{formatPreviewQuantity(item.quantity)}</p>
              <p className="text-end tabular-nums">
                {isBillableLineItem(item) ? toCurrency((item.quantity ?? 0) * (item.unitPriceCents ?? 0)) : ""}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-0.5 border-t border-stone-300 px-2 py-2 text-sm">
        <span />
        <span className="text-end text-xs uppercase tracking-wide text-stone-500">
          {summary.perPerson ? `Per person (${formatGuests(summary.perPerson)})` : ""}
        </span>
        <span className="text-end text-xs uppercase tracking-wide text-stone-500">Package total</span>
        <BreakdownRow label="Subtotal" summary={summary} pick={(b) => b.subtotalCents} />
        <BreakdownRow label={`HST (${Math.round(HST_RATE * 100)}%)`} summary={summary} pick={(b) => b.hstCents} />
        <BreakdownRow
          label={`Gratuity (${Math.round(GRATUITY_RATE * 100)}%)`}
          summary={summary}
          pick={(b) => b.gratuityCents}
        />
        <BreakdownRow label="Total" summary={summary} pick={(b) => b.totalCents} emphasis />
      </div>

      {summary.unpricedItemNames.length > 0 ? (
        <p className="border-t border-dashed border-stone-300 px-2 py-1 text-xs italic text-stone-500">
          Not included in the price (no quantity or price yet): {summary.unpricedItemNames.join(", ")}
        </p>
      ) : null}
    </div>
  )
}

function BreakdownRow({
  label,
  summary,
  pick,
  emphasis = false,
}: {
  label: string
  summary: FoodPackageSummary
  pick: (breakdown: ChargeBreakdown) => number
  emphasis?: boolean
}) {
  const valueClass = emphasis ? "text-end font-semibold tabular-nums" : "text-end tabular-nums"
  return (
    <>
      <span className="text-stone-600">{label}</span>
      <span className={valueClass}>{summary.perPerson ? formatPerPerson(summary.perPerson, pick) : ""}</span>
      <span className={valueClass}>{toCurrency(pick(summary.totals))}</span>
    </>
  )
}

function formatPerPerson(perPerson: PerPersonPricing, pick: (breakdown: ChargeBreakdown) => number): string {
  return formatCurrencyRange(pick(perPerson.atMaxGuests), pick(perPerson.atMinGuests))
}

function formatGuests(perPerson: PerPersonPricing): string {
  const { min, max } = perPerson.guests
  return min === max ? `${max} guests` : `${min}–${max} guests`
}
