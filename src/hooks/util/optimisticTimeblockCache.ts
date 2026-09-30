import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

type ListFieldKey = "foodItems" | "beverageItems"

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
