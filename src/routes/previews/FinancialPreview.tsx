import React from 'react'
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { formatDate } from "~/lib/formatters"
import {
  GRATUITY_RATE,
  computeChargeLineTotalCents,
  computeFinancialPreviewModel,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"

import westlinksLogo from '~/assets/Westlinks-SM-RGB.png'
import siloLogo from '~/assets/SILO-SM-RGB.png'
import { usePaymentsSection } from '~/hooks/usePaymentsSection'

export default function FinancialPreview() {
  
  const { data: event } = useEvent()

  const { data: chargeItems } = useMenuOfChargeItemsSection()
  const { data: food } = useFoodSection()
  const { data: beverage } = useBeverageSection()

  const { data: payments } = usePaymentsSection()

  const chargeItemsByCategory = chargeItems?.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof chargeItems>)

  const summary = computeFinancialPreviewModel({
    menuItems: chargeItems,
    foodTimeblocks: food,
    beverageTimeblocks: beverage,
    payments,
  })

  return (
    <div>
      {/* Westlinks Header */}
      <div className="flex justify-between items-center pb-6">
        <div className="">
          <h2 className="text-xl font-bold">{ "Event Estimate" }</h2>
          <p className="text-sm font-medium">The Club at Westlinks</p>
          <p className="text-xs italic">2089 Bruce Rd 17, Port Elgin, ON</p>
        </div>

        <div className="flex gap-4">
          <img className="w-25 h-25" src={westlinksLogo} />
          <img className="w-25 h-25" src={siloLogo} />
        </div>
      </div>

      {/* Details */}
      <div className="border-b-2 mb-4 flex justify-between">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pb-2">
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">{event?.clientName}</dd>

              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{event?.clientPhone}</dd>

              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{event?.clientEmail}</dd>
          </dl>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pb-2">
              <dt className="text-muted-foreground">Event Date</dt>
              <dd className="font-medium">{formatDate(event?.startDateTime ?? "")}</dd>

              <dt className="text-muted-foreground">Estimate Date</dt>
              <dd className="font-medium">{formatDate((new Date).toString())}</dd>

              <dt className="text-muted-foreground text-white">#</dt>
              <dd className="font-medium text-white">#</dd>
          </dl>
      </div>


      {/* Body */}
      <div className="flex flex-col gap-6">
        {/* Invoice Title Line */}
        <div className="flex justify-between border-b-2 border-black pt-6">
          <p className="text-xl font-bold">Estimate Total</p>
          <p className="text-xl font-bold">{toCurrency(summary.grandTotalCents)}</p>
        </div>

        {/* Venue Section */}
        {chargeItemsByCategory && chargeItemsByCategory["Venue"] && <div>
          <div className="grid grid-cols-6 border-b-1 border-dashed border-black text-sm pt-2">
            <p className="col-span-3">Venue</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end">Total</p>
          </div>

          <div className="grid grid-cols-6 text-sm pt-2">
            {chargeItemsByCategory["Venue"].map(item => (
              <React.Fragment key={item.id}>
                <p className="col-span-3 text font-bold">{item.name}</p>
                <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                <p className="col-span-1 text-end">{toCurrency(computeChargeLineTotalCents(item))}</p>
              </React.Fragment>
            ))}
          </div>
        </div>}

        {/* Venue Section */}
        {chargeItemsByCategory && chargeItemsByCategory["Golf"] && <div>
          <div className="grid grid-cols-6 border-b-1 border-dashed border-black text-sm pt-2">
            <p className="col-span-3">Golf</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end">Total</p>
          </div>

          <div className="grid grid-cols-6 text-sm pt-2">
            {chargeItemsByCategory["Golf"].map(item => (
              <React.Fragment key={item.id}>
                <p className="col-span-3 text font-bold">{item.name}</p>
                <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                <p className="col-span-1 text-end">{toCurrency(computeChargeLineTotalCents(item))}</p>
              </React.Fragment>
            ))}
          </div>
        </div>}


        {chargeItemsByCategory && chargeItemsByCategory["Goods"] && <div>
          <div className="grid grid-cols-6 border-b-1 border-dashed border-black text-sm pt-2">
            <p className="col-span-3">Goods</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end">Total</p>
          </div>

          <div className="grid grid-cols-6 text-sm pt-2">
            {chargeItemsByCategory["Goods"].map(item => (
              <React.Fragment key={item.id}>
                <p className="col-span-3 text font-bold">{item.name}</p>
                <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                <p className="col-span-1 text-end">{toCurrency(computeChargeLineTotalCents(item))}</p>
              </React.Fragment>
            ))}
          </div>
        </div>}


        {/* Service Section */}
        {chargeItemsByCategory && chargeItemsByCategory["Service"] && <div>
          <div className="grid grid-cols-6 border-b-1 border-dashed border-black text-sm pt-2">
            <p className="col-span-3">Service</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end">Total</p>
          </div>

          <div className="grid grid-cols-6 text-sm pt-2">
            {chargeItemsByCategory["Service"].map(item => (
              <React.Fragment key={item.id}>
                <p className="col-span-3 text font-bold">{item.name}</p>
                <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                <p className="col-span-1 text-end">{toCurrency(computeChargeLineTotalCents(item))}</p>
              </React.Fragment>
            ))}
          </div>
        </div>}

        {/* Food & Beverage Section */}
        {(chargeItemsByCategory && chargeItemsByCategory["Food & Beverage"] || food || beverage) && <div>
          <div className="grid grid-cols-6 border-b-1 border-dashed border-black text-sm pt-2">
            <p className="col-span-3">Food & Beverage</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end">Total</p>
          </div>

          <div className="grid grid-cols-6 text-sm pt-2">
            {/* Food Direct */}
            {food && food.map(timeblock => (
              <React.Fragment key={timeblock.id}>
                {timeblock.foodItems?.map(item => (item.quantity && item.quantity > 0 &&  item.unitPriceCents && item.unitPriceCents > 0) && (
                  <React.Fragment key={item.id}>
                    <p className="col-span-3 text font-bold">{item.name}</p>
                    <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                    <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                    <p className="col-span-1 text-end">{toCurrency((item.quantity ?? 0) * (item.unitPriceCents ?? 0))}</p>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {/* Beverage Direct */}
            {beverage && beverage.map(timeblock => (
              <React.Fragment key={timeblock.id}>
                {timeblock.beverageItems?.map(item => (item.quantity && item.quantity > 0 &&  item.unitPriceCents && item.unitPriceCents > 0) && (
                  <React.Fragment key={timeblock.id}>
                    <p className="col-span-3 text font-bold">{item.name}</p>
                    <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                    <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                    <p className="col-span-1 text-end">{toCurrency((item.quantity ?? 0) * (item.unitPriceCents ?? 0))}</p>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {/* Food & Beverage Charge Sections */}
            {chargeItemsByCategory && chargeItemsByCategory["Food & Beverage"] && chargeItemsByCategory["Food & Beverage"].map(item => (
              <React.Fragment key={item.id}>
                <p className="col-span-3 text font-bold">{item.name}</p>
                <p className="col-span-1 text-end">{toCurrency(item.unitPriceCents ?? 0)}</p>
                <p className="col-span-1 text-end">{item.quantity ?? 0}</p>
                <p className="col-span-1 text-end">{toCurrency(computeChargeLineTotalCents(item))}</p>
              </React.Fragment>
            ))}
          </div>
        </div>}


        {/* Totals */}        
        <div className="flex justify-end border-dashed border-t-1 border-black mt-16">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pb-2">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-end">{toCurrency(summary.chargesSubtotalCents)}</dd>

              <dt className="text-muted-foreground">HST (13%)</dt>
              <dd className="font-medium text-end">{toCurrency(summary.hstCents)}</dd>

              <dt className="text-muted-foreground">Gratuity ({Math.round(GRATUITY_RATE * 100)}% on Food + Beverage)</dt>
              <dd className="font-medium text-end">{toCurrency(summary.gratuityCents)}</dd>

              <dt className="text-muted-foreground">Charges Total</dt>
              <dd className="font-medium text-end">{toCurrency(summary.chargesTotalCents)}</dd>

              <dt className="text-muted-foreground">Grand Total</dt>
              <dd className="font-medium text-end">{toCurrency(summary.grandTotalCents)}</dd>

              <dt className="text-muted-foreground">Payments Made</dt>
              <dd className="font-medium text-end">{toCurrency(summary.paidTotalCents)}</dd>

              <dt className="text-muted-foreground">Balance Due</dt>
              <dd className="font-medium text-end">{toCurrency(summary.balanceDueCents)}</dd>
          </dl>
        </div>

        {payments && payments.length > 0 && <div>
          <h2 className='text-sm'>Payments Made</h2>
          <div className='grid grid-cols-4 text-xs text-stone-400 border-stone-400 py-2 border-b-1'>
            <p>Date</p>
            <p>For</p>
            <p>Amount</p>
            <p>Reciept No.</p>
          </div>
          {payments.map(payment => (
            <div key={payment.id} className='grid grid-cols-4 text-sm py-2 border-b-1 border-stone-400 border-dashed'>
              <p>{formatDate(payment.date)}</p>
              <p>{payment.notes}</p>
              <p>{toCurrency(payment.amountCents ?? 0)}</p>
              <p>{payment.recieptNumber}</p>
            </div>
          ))}
        </div>}
      </div>

    </div>
  )
}
