import type { ChargeCategory, MenuOfChargeItem, Payment, BeverageItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

export const HST_RATE = 0.13
export const GRATUITY_RATE = 0.18

export function centsToDollars(cents: number | null | undefined): number {
  return (cents ?? 0) / 100
}

export function dollarsToCents(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0

  const asNumber = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(asNumber)) return 0

  return Math.round(asNumber * 100)
}

export function computeChargeLineTotalCents(item: MenuOfChargeItem): number {
  return (item.quantity ?? 0) * (item.unitPriceCents ?? 0)
}

export function computeBillableLineTotalCents(item: { quantity: number | null; unitPriceCents: number | null }): number {
  return (item.quantity ?? 0) * (item.unitPriceCents ?? 0)
}

export function computeMenuSubtotalCents(items: MenuOfChargeItem[] | undefined): number {
  if (!items || items.length === 0) return 0

  return items.reduce((sum, item) => sum + computeChargeLineTotalCents(item), 0)
}

export function computeCategorySubtotalCents(
  items: MenuOfChargeItem[] | undefined,
  category: ChargeCategory,
): number {
  if (!items || items.length === 0) return 0

  return items
    .filter((item) => item.category === category)
    .reduce((sum, item) => sum + computeChargeLineTotalCents(item), 0)
}

export function computePaymentsTotalCents(payments: Payment[] | undefined): number {
  if (!payments || payments.length === 0) return 0

  return payments.reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0)
}

export function computeFinancialSummary(items: MenuOfChargeItem[] | undefined, payments: Payment[] | undefined) {
  const menuSubtotalCents = computeMenuSubtotalCents(items)
  const hstCents = Math.round(menuSubtotalCents * HST_RATE)
  const chargesTotalCents = menuSubtotalCents + hstCents
  const paidTotalCents = computePaymentsTotalCents(payments)
  const balanceDueCents = chargesTotalCents - paidTotalCents

  return {
    menuSubtotalCents,
    hstCents,
    chargesTotalCents,
    paidTotalCents,
    balanceDueCents,
  }
}

export function computeFoodSubtotalCents(foodTimeblocks: TimeblockWithItems[] | undefined): number {
  if (!foodTimeblocks || foodTimeblocks.length === 0) return 0

  return foodTimeblocks.reduce((sum, timeblock) => (
    sum + (timeblock.foodItems ?? []).reduce((itemSum, item) => itemSum + computeBillableLineTotalCents(item), 0)
  ), 0)
}

export function computeBeverageSubtotalCents(beverageItems: BeverageItem[] | undefined): number {
  if (!beverageItems || beverageItems.length === 0) return 0

  return beverageItems.reduce((sum, item) => sum + computeBillableLineTotalCents(item), 0)
}

export function computeAllChargesSubtotalCents(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
}): number {
  return computeMenuSubtotalCents(params.menuItems)
    + computeFoodSubtotalCents(params.foodTimeblocks)
    + computeBeverageSubtotalCents(params.beverageItems)
}

export function computeGratuityBaseCents(foodSubtotalCents: number, beverageSubtotalCents: number): number {
  return foodSubtotalCents + beverageSubtotalCents
}

export function computeGratuityCents(gratuityBaseCents: number): number {
  return Math.round(gratuityBaseCents * GRATUITY_RATE)
}

export function computeFinancialSummaryAllSources(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  payments: Payment[] | undefined
}) {
  const menuSubtotalCents = computeMenuSubtotalCents(params.menuItems)
  const foodSubtotalCents = computeFoodSubtotalCents(params.foodTimeblocks)
  const beverageSubtotalCents = computeBeverageSubtotalCents(params.beverageItems)
  const chargesSubtotalCents = menuSubtotalCents + foodSubtotalCents + beverageSubtotalCents
  const gratuityBaseCents = computeGratuityBaseCents(foodSubtotalCents, beverageSubtotalCents)
  const gratuityCents = computeGratuityCents(gratuityBaseCents)
  const hstCents = Math.round(chargesSubtotalCents * HST_RATE)
  const chargesTotalCents = chargesSubtotalCents + hstCents
  const grandTotalCents = chargesTotalCents + gratuityCents
  const paidTotalCents = computePaymentsTotalCents(params.payments)
  const balanceDueCents = grandTotalCents - paidTotalCents

  return {
    menuSubtotalCents,
    foodSubtotalCents,
    beverageSubtotalCents,
    chargesSubtotalCents,
    gratuityBaseCents,
    gratuityCents,
    hstCents,
    chargesTotalCents,
    grandTotalCents,
    paidTotalCents,
    balanceDueCents,
  }
}

export function computeFinancialPreviewModel(params: {
  menuItems: MenuOfChargeItem[] | undefined
  foodTimeblocks: TimeblockWithItems[] | undefined
  beverageItems: BeverageItem[] | undefined
  payments: Payment[] | undefined
}) {
  return computeFinancialSummaryAllSources(params)
}

export function toCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToDollars(cents))
}

export function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return ""

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function fromDateInputValue(dateValue: string): string {
  if (!dateValue) return ""
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString()
}
