import React, { useMemo, type ReactNode } from "react"

import westlinksLogo from "~/assets/Westlinks-SM-RGB.png"
import siloLogo from "~/assets/SILO-SM-RGB.png"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import {
  GRATUITY_RATE,
  computeChargeLineTotalCents,
  computeFinancialPreviewModel,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
  isBillableLineItem,
} from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"
import { formatDate } from "~/lib/formatters"
import type { MenuOfChargeItem } from "~/definitions/database"

const CHARGE_CATEGORIES = ["Venue", "Golf", "Goods", "Service", "Food & Beverage"] as const

type ChargeTableSpec = {
  id: string
  title: string
  rows: ReactNode
}

function buildChargeTableSpecs(params: {
  chargeItemsByCategory: Record<string, MenuOfChargeItem[]>
  billableFoodRows: Array<{
    key: string
    name: string
    unitPriceCents: number | null | undefined
    quantity: number | null | undefined
  }>
  billableBeverageRows: Array<{
    id: string
    name: string
    unitPriceCents: number | null | undefined
    quantity: number | null | undefined
  }>
  hasFoodBeverageSection: boolean
}): ChargeTableSpec[] {
  const {
    chargeItemsByCategory,
    billableFoodRows,
    billableBeverageRows,
    hasFoodBeverageSection,
  } = params

  const specs: ChargeTableSpec[] = []

  for (const category of CHARGE_CATEGORIES) {
    if (category === "Food & Beverage") {
      if (!hasFoodBeverageSection) continue
      specs.push({
        id: "financial-table-food-beverage",
        title: "Food & Beverage",
        rows: (
          <>
            {billableFoodRows.map((item) => (
              <ChargeRow
                key={item.key}
                name={item.name}
                unitPriceCents={item.unitPriceCents}
                quantity={item.quantity}
                totalCents={(item.quantity ?? 0) * (item.unitPriceCents ?? 0)}
              />
            ))}
            {billableBeverageRows.map((item) => (
              <ChargeRow
                key={item.id}
                name={item.name}
                unitPriceCents={item.unitPriceCents}
                quantity={item.quantity}
                totalCents={(item.quantity ?? 0) * (item.unitPriceCents ?? 0)}
              />
            ))}
            {(chargeItemsByCategory["Food & Beverage"] ?? []).map((item) => (
              <ChargeRow
                key={item.id}
                name={item.name}
                unitPriceCents={item.unitPriceCents}
                quantity={item.quantity}
                totalCents={computeChargeLineTotalCents(item)}
              />
            ))}
          </>
        ),
      })
      continue
    }

    const items = chargeItemsByCategory[category]
    if (!items || items.length === 0) continue

    specs.push({
      id: `financial-table-${category.toLowerCase()}`,
      title: category,
      rows: (
        <>
          {items.map((item) => (
            <ChargeRow
              key={item.id}
              name={item.name}
              unitPriceCents={item.unitPriceCents}
              quantity={item.quantity}
              totalCents={computeChargeLineTotalCents(item)}
            />
          ))}
        </>
      ),
    })
  }

  if ((chargeItemsByCategory["Other"]?.length ?? 0) > 0) {
    specs.push({
      id: "financial-table-other",
      title: "Other",
      rows: (
        <>
          {chargeItemsByCategory["Other"].map((item) => (
            <ChargeRow
              key={item.id}
              name={item.name}
              unitPriceCents={item.unitPriceCents}
              quantity={item.quantity}
              totalCents={computeChargeLineTotalCents(item)}
            />
          ))}
        </>
      ),
    })
  }

  return specs
}

export default function FinancialPreview() {
  const { data: event } = useEvent()
  const { data: chargeItems } = useMenuOfChargeItemsSection()
  const { data: food } = useFoodSection()
  const { items: beverageItems } = useBeverageSection()
  const { data: payments } = usePaymentsSection()
  const { state } = usePreviewPreferences()
  const prefs = state["financial-report"]

  const chargeItemsByCategory = useMemo(() => {
    return (chargeItems ?? []).reduce(
      (acc, item) => {
        const category = item.category || "Other"
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      },
      {} as Record<string, MenuOfChargeItem[]>,
    )
  }, [chargeItems])

  const summary = computeFinancialPreviewModel({
    menuItems: chargeItems,
    foodTimeblocks: food,
    beverageItems,
    payments,
  })

  const billableFoodRows = (food ?? []).flatMap((timeblock) =>
    (timeblock.foodItems ?? [])
      .filter(isBillableLineItem)
      .map((item) => ({ ...item, key: item.id })),
  )

  const billableBeverageRows = beverageItems.filter(isBillableLineItem)

  const hasFoodBeverageSection =
    billableFoodRows.length > 0 ||
    billableBeverageRows.length > 0 ||
    (chargeItemsByCategory["Food & Beverage"]?.length ?? 0) > 0

  const chargeTables = buildChargeTableSpecs({
    chargeItemsByCategory,
    billableFoodRows,
    billableBeverageRows,
    hasFoodBeverageSection,
  })

  const showAppendix = prefs.showBeverageAppendix && beverageItems.length > 0
  const beverageSections = getVisibleBeverageTypeSections(beverageItems, {
    hideEmptySpecialOrders: true,
  }).filter((section) => section.items.length > 0)

  return (
    <PreviewDocument
      continuationHeadings={{
        "beverage-appendix": (
          <h2 className="mb-2 text-lg font-bold">Beverage Availability (continued)</h2>
        ),
      }}
    >
      <PreviewBlock id="financial-header" keepTogether>
        <div>
          <div className="flex items-center justify-between pb-6">
            <div>
              <h2 className="text-xl font-bold">Event Estimate</h2>
              <p className="text-sm font-medium">The Club at Westlinks</p>
              <p className="text-xs italic">2089 Bruce Rd 17, Port Elgin, ON</p>
            </div>
            <div className="flex gap-4">
              <img className="h-25 w-25" src={westlinksLogo} alt="Westlinks" />
              <img className="h-25 w-25" src={siloLogo} alt="SILO" />
            </div>
          </div>

          <div className="mb-4 flex justify-between border-b-2">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
              {event?.clientName ? (
                <>
                  <dt className="text-muted-foreground">To</dt>
                  <dd className="font-medium">{event.clientName}</dd>
                </>
              ) : null}
              {event?.clientPhone ? (
                <>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{event.clientPhone}</dd>
                </>
              ) : null}
              {event?.clientEmail ? (
                <>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{event.clientEmail}</dd>
                </>
              ) : null}
            </dl>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
              <dt className="text-muted-foreground">Event Date</dt>
              <dd className="font-medium">{formatDate(event?.startDateTime ?? "")}</dd>
              <dt className="text-muted-foreground">Estimate Date</dt>
              <dd className="font-medium">{formatDate(new Date().toString())}</dd>
            </dl>
          </div>
        </div>
      </PreviewBlock>

      {chargeTables.map((table) => (
        <PreviewBlock key={table.id} id={table.id} keepTogether className="mb-6">
          <ChargeTable title={table.title}>{table.rows}</ChargeTable>
        </PreviewBlock>
      ))}

      <PreviewBlock id="financial-totals" keepTogether className="mb-6">
        <div className="mt-10 flex justify-end border-t border-dashed border-black">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
            {prefs.showChargeBreakdown ? (
              <>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="text-end font-medium">
                  {toCurrency(summary.chargesSubtotalCents)}
                </dd>
                <dt className="text-muted-foreground">HST (13%)</dt>
                <dd className="text-end font-medium">{toCurrency(summary.hstCents)}</dd>
                <dt className="text-muted-foreground">
                  Gratuity ({Math.round(GRATUITY_RATE * 100)}% on Food + Beverage)
                </dt>
                <dd className="text-end font-medium">{toCurrency(summary.gratuityCents)}</dd>
              </>
            ) : null}

            <dt className="text-muted-foreground">Grand Total</dt>
            <dd className="text-end font-medium">{toCurrency(summary.grandTotalCents)}</dd>

            {prefs.showPaymentStatus && (payments?.length ?? 0) > 0 ? (
              <>
                <dt className="text-muted-foreground">Payments Made</dt>
                <dd className="text-end font-medium">{toCurrency(summary.paidTotalCents)}</dd>
                <dt className="text-muted-foreground">Balance Due</dt>
                <dd className="text-end font-medium">{toCurrency(summary.balanceDueCents)}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </PreviewBlock>

      {(payments?.length ?? 0) > 0 ? (
        <PreviewBlock id="financial-payments" keepTogether className="mb-6">
          <div>
            <h2 className="text-sm">Payments Made</h2>
            <div className="grid grid-cols-4 border-b border-stone-400 py-2 text-xs text-stone-400">
              <p>Date</p>
              <p>For</p>
              <p>Amount</p>
              <p>Receipt No.</p>
            </div>
            {payments?.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-4 border-b border-dashed border-stone-400 py-2 text-sm"
              >
                <p>{formatDate(payment.date)}</p>
                <p>{payment.notes}</p>
                <p>{toCurrency(payment.amountCents ?? 0)}</p>
                <p>{payment.recieptNumber}</p>
              </div>
            ))}
          </div>
        </PreviewBlock>
      ) : null}

      {showAppendix ? (
        <>
          <PreviewBlock id="financial-beverage-appendix-header" breakBefore keepTogether>
            <div>
              <h2 className="text-lg font-bold">Beverage Availability</h2>
              <p className="mb-4 mt-1 text-sm text-stone-600">
                Separate list of beverages available during the event. This is not an additional
                charge table — priced quantities already included in the estimate appear above.
              </p>
            </div>
          </PreviewBlock>
          {beverageSections.map((section) => (
            <PreviewBlock
              key={`financial-beverage-appendix-${section.type}`}
              id={`financial-beverage-appendix-${section.type}`}
              continuationKey="beverage-appendix"
              keepTogether
              className="mb-4"
            >
              <div>
                <div className="grid grid-cols-6 border-b border-dashed border-black pt-2 text-sm">
                  <p className="col-span-3 font-semibold">{section.type}</p>
                  <p className="col-span-1 text-end">Cost</p>
                  <p className="col-span-1 text-end">Qty.</p>
                  <p className="col-span-1 text-end" />
                </div>
                <div className="grid grid-cols-6 pt-2 text-sm">
                  {section.items.map((item) => (
                    <React.Fragment key={item.id}>
                      <div className="col-span-3">
                        <p className="font-bold">{item.name}</p>
                        {prefs.showBeverageNotes && item.includes?.trim() ? (
                          <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-stone-600">
                            {item.includes}
                          </pre>
                        ) : null}
                      </div>
                      <p className="col-span-1 text-end">
                        {formatPreviewPrice(item.unitPriceCents, toCurrency)}
                      </p>
                      <p className="col-span-1 text-end">
                        {formatPreviewQuantity(item.quantity)}
                      </p>
                      <p className="col-span-1 text-end" />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </PreviewBlock>
          ))}
        </>
      ) : null}
    </PreviewDocument>
  )
}

function ChargeTable({ title, children }: { title: string; children: React.ReactNode }) {
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

function ChargeRow({
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
