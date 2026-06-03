import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

type ListFieldKey = "foodItems" | "beverageItems"
type NestedFieldKey = "vendorItem"

export function appendListItem<K extends ListFieldKey>(
  cache: TimeblockWithItems[] | undefined,
  timeblockId: string,
  key: K,
  item: NonNullable<TimeblockWithItems[K]>[number],
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) => {
    if (timeblock.id !== timeblockId) {
      return timeblock
    }

    const nextItems = [...((timeblock[key] ?? []) as NonNullable<TimeblockWithItems[K]>), item]
    return { ...timeblock, [key]: nextItems } as TimeblockWithItems
  })
}

export function updateListItem<K extends ListFieldKey>(
  cache: TimeblockWithItems[] | undefined,
  timeblockId: string,
  key: K,
  itemId: string,
  updates: Partial<NonNullable<TimeblockWithItems[K]>[number]>,
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) => {
    if (timeblock.id !== timeblockId) {
      return timeblock
    }

    const currentItems = (timeblock[key] ?? []) as NonNullable<TimeblockWithItems[K]>
    const nextItems = currentItems.map((existingItem) =>
      existingItem.id === itemId ? { ...existingItem, ...updates } : existingItem,
    ) as NonNullable<TimeblockWithItems[K]>

    return { ...timeblock, [key]: nextItems } as TimeblockWithItems
  })
}

export function removeListItem<K extends ListFieldKey>(
  cache: TimeblockWithItems[] | undefined,
  timeblockId: string,
  key: K,
  itemId: string,
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) => {
    if (timeblock.id !== timeblockId) {
      return timeblock
    }

    const currentItems = (timeblock[key] ?? []) as NonNullable<TimeblockWithItems[K]>
    const nextItems = currentItems.filter((existingItem) => existingItem.id !== itemId) as NonNullable<TimeblockWithItems[K]>

    return { ...timeblock, [key]: nextItems } as TimeblockWithItems
  })
}

export function replaceListItemByTempId<K extends ListFieldKey>(
  cache: TimeblockWithItems[] | undefined,
  timeblockId: string,
  key: K,
  tempId: string,
  serverItem: NonNullable<TimeblockWithItems[K]>[number],
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) => {
    if (timeblock.id !== timeblockId) {
      return timeblock
    }

    const currentItems = (timeblock[key] ?? []) as NonNullable<TimeblockWithItems[K]>
    const nextItems = currentItems.map((existingItem) =>
      existingItem.id === tempId ? serverItem : existingItem,
    ) as NonNullable<TimeblockWithItems[K]>

    return { ...timeblock, [key]: nextItems } as TimeblockWithItems
  })
}

export function updateNestedOneToOneById<K extends NestedFieldKey>(
  cache: TimeblockWithItems[] | undefined,
  key: K,
  nestedItemId: string,
  updates: Partial<NonNullable<TimeblockWithItems[K]>>,
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) => {
    const nestedItem = timeblock[key]
    if (!nestedItem || nestedItem.id !== nestedItemId) {
      return timeblock
    }

    return {
      ...timeblock,
      [key]: {
        ...nestedItem,
        ...updates,
      },
    } as TimeblockWithItems
  })
}

export function replaceTimeblockById(
  cache: TimeblockWithItems[] | undefined,
  timeblockId: string,
  replacement: TimeblockWithItems,
): TimeblockWithItems[] {
  return (cache ?? []).map((timeblock) =>
    timeblock.id === timeblockId ? replacement : timeblock,
  )
}
