import type { Event } from "~/definitions/database"
import type { BeverageItemWithAssignments } from "~/definitions/beverage/beverage-types"
import type { TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"

export type TimeblockOption = {
  id: string
  title: string
  time: string | null
  label: string
}

export function hasContactInfo(event: Pick<Event, "clientName" | "clientPhone" | "clientEmail"> | null | undefined): boolean {
  if (!event) return false
  return Boolean(event.clientName?.trim() || event.clientPhone?.trim() || event.clientEmail?.trim())
}

export function hasInternalNotes(event: Pick<Event, "internalNotes"> | null | undefined): boolean {
  return Boolean(event?.internalNotes?.trim())
}

export function sortTimeblocksByTime<T extends { time?: string | null; title?: string | null; id: string }>(
  timeblocks: T[] | undefined | null,
): T[] {
  if (!timeblocks || timeblocks.length === 0) return []
  return [...timeblocks].sort((a, b) => {
    const timeCmp = (a.time ?? "").localeCompare(b.time ?? "")
    if (timeCmp !== 0) return timeCmp
    const titleCmp = (a.title ?? "").localeCompare(b.title ?? "")
    if (titleCmp !== 0) return titleCmp
    return a.id.localeCompare(b.id)
  })
}

export function toTimeblockOptions(
  timeblocks: Array<{ id: string; title: string; time?: string | null }> | undefined | null,
): TimeblockOption[] {
  const sorted = sortTimeblocksByTime(timeblocks ?? [])
  const titleCounts = new Map<string, number>()
  for (const tb of sorted) {
    titleCounts.set(tb.title, (titleCounts.get(tb.title) ?? 0) + 1)
  }

  return sorted.map((tb) => {
    const duplicateTitle = (titleCounts.get(tb.title) ?? 0) > 1
    const label =
      duplicateTitle && tb.time
        ? `${tb.title} (${tb.time})`
        : tb.time
          ? `${tb.title} — ${tb.time}`
          : tb.title

    return {
      id: tb.id,
      title: tb.title,
      time: tb.time ?? null,
      label,
    }
  })
}

export function filterSelectedIds(selectedIds: string[], availableIds: string[]): string[] {
  const available = new Set(availableIds)
  return selectedIds.filter((id) => available.has(id))
}

export function hasPricedFoodOrBeverage(params: {
  foodTimeblocks?: TimeblockWithItems[] | null
  beverageItems?: Array<{ unitPriceCents: number | null }> | null
}): boolean {
  const foodHasPrice = (params.foodTimeblocks ?? []).some((tb) =>
    (tb.foodItems ?? []).some((item) => (item.unitPriceCents ?? 0) > 0),
  )
  const beverageHasPrice = (params.beverageItems ?? []).some(
    (item) => (item.unitPriceCents ?? 0) > 0,
  )
  return foodHasPrice || beverageHasPrice
}

export function hasBeverageNotes(items: Array<{ includes: string | null }> | null | undefined): boolean {
  return (items ?? []).some((item) => Boolean(item.includes?.trim()))
}

export function hasBeverageSectionContent(params: {
  timeblocks?: Array<{ id: string }> | null
  items?: BeverageItemWithAssignments[] | null
}): boolean {
  return (params.timeblocks?.length ?? 0) > 0 || (params.items?.length ?? 0) > 0
}

export function isSystemTimelineRow(timeblock: TimelineTimeblock): boolean {
  return (
    timeblock.sectionType === SECTION_TYPE.TOURNAMENT_DETAIL ||
    timeblock.sectionType === SECTION_TYPE.CART_DETAIL
  )
}

export function formatPreviewQuantity(quantity: number | null | undefined): string {
  if (quantity == null || quantity === 0) return ""
  return String(quantity)
}

export function formatPreviewPrice(cents: number | null | undefined, toCurrency: (cents: number) => string): string {
  if (cents == null || cents === 0) return ""
  return toCurrency(cents)
}

export function isBillableLineItem(item: {
  quantity: number | null | undefined
  unitPriceCents: number | null | undefined
}): boolean {
  return (item.quantity ?? 0) > 0 && (item.unitPriceCents ?? 0) > 0
}
