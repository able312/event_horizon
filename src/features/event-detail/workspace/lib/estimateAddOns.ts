import type { BeverageItem, FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  computeBillableLineTotalCents,
  computeFoodTimeblockRates,
  getPricingBasis,
  type GuestCountRange,
} from "./financial"

// Optional add-ons are ordinary planning items (or whole food timeblocks) flagged in the
// Estimate section. They are offered on the estimate but left out of its totals, and out of
// the invoice, until the client accepts one and the flag is cleared.

/** Records saved before add-ons existed are not add-ons. */
export function isAddOn(record: { isAddOn?: boolean | null }): boolean {
  return record.isAddOn === true
}

export type EstimateAddOn = {
  key: string
  name: string
  /** What a timeblock add-on includes (its item names); empty for a single item. */
  includes: string[]
  /** Fixed part: quantity × price over fixed-price ("each") items. */
  fixedCents: number
  /** What each guest adds: per-person prices, or the timeblock's package price. */
  perPersonRateCents: number
}

export type EstimateAddOnSplit<B extends BeverageItem = BeverageItem> = {
  /** Food timeblocks counted in the totals, without add-on timeblocks or add-on items. */
  foodTimeblocks: TimeblockWithItems[]
  /** Beverage items counted in the totals. */
  beverageItems: B[]
  /** Offered separately, in planning order: food, then beverage. */
  addOns: EstimateAddOn[]
}

function itemAddOn(key: string, item: Pick<FoodItem, "name" | "quantity" | "unitPriceCents" | "pricingBasis">): EstimateAddOn {
  const perPerson = getPricingBasis(item) === "per_person"
  return {
    key,
    name: item.name || "Untitled item",
    includes: [],
    fixedCents: perPerson ? 0 : computeBillableLineTotalCents(item),
    perPersonRateCents: perPerson ? item.unitPriceCents ?? 0 : 0,
  }
}

function timeblockAddOn(timeblock: TimeblockWithItems): EstimateAddOn {
  const { eachSubtotalCents, perPersonRateCents } = computeFoodTimeblockRates(timeblock)
  return {
    key: `timeblock-${timeblock.id}`,
    name: timeblock.title || "Untitled",
    includes: (timeblock.foodItems ?? []).map((item) => item.name).filter(Boolean),
    fixedCents: eachSubtotalCents,
    perPersonRateCents,
  }
}

/** Separates optional add-ons from what the estimate totals count. */
export function splitEstimateAddOns<B extends BeverageItem>(
  foodTimeblocks: TimeblockWithItems[] | null | undefined,
  beverageItems: B[] | null | undefined,
): EstimateAddOnSplit<B> {
  const addOns: EstimateAddOn[] = []
  const counted: TimeblockWithItems[] = []

  for (const timeblock of foodTimeblocks ?? []) {
    if (isAddOn(timeblock)) {
      addOns.push(timeblockAddOn(timeblock))
      continue
    }
    const items = timeblock.foodItems ?? []
    for (const item of items.filter(isAddOn)) addOns.push(itemAddOn(`food-${item.id}`, item))
    counted.push({ ...timeblock, foodItems: items.filter((item) => !isAddOn(item)) })
  }

  const beverages = beverageItems ?? []
  for (const item of beverages.filter(isAddOn)) addOns.push(itemAddOn(`beverage-${item.id}`, item))

  return {
    foodTimeblocks: counted,
    beverageItems: beverages.filter((item) => !isAddOn(item)),
    addOns,
  }
}

/** An add-on's subtotal across the guest count; per-person pricing is left out without one. */
export function computeAddOnSubtotal(
  addOn: Pick<EstimateAddOn, "fixedCents" | "perPersonRateCents">,
  guests: GuestCountRange | null,
): { lowCents: number; highCents: number } {
  const at = (guestCount: number | null) => addOn.fixedCents + (guestCount == null ? 0 : addOn.perPersonRateCents * guestCount)
  return { lowCents: at(guests?.min ?? null), highCents: at(guests?.max ?? null) }
}
