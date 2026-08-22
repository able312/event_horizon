import type { BeverageItem } from "~/definitions/database"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types"

export function appendBeverageItem(
  cache: BeverageSectionPayload | undefined,
  item: BeverageItemWithAssignments,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    items: [...current.items, item],
  }
}

export function updateBeverageItem(
  cache: BeverageSectionPayload | undefined,
  itemId: string,
  updates: Partial<BeverageItem>,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item,
    ),
  }
}

export function removeBeverageItem(
  cache: BeverageSectionPayload | undefined,
  itemId: string,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    items: current.items.filter((item) => item.id !== itemId),
  }
}

export function replaceBeverageItemByTempId(
  cache: BeverageSectionPayload | undefined,
  tempId: string,
  serverItem: BeverageItemWithAssignments,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    items: current.items.map((item) =>
      item.id === tempId ? serverItem : item,
    ),
  }
}

export function setBeverageItemAssignments(
  cache: BeverageSectionPayload | undefined,
  itemId: string,
  assignedTimeblockIds: string[],
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, assignedTimeblockIds } : item,
    ),
  }
}

export function removeTimeblockFromBeverageSection(
  cache: BeverageSectionPayload | undefined,
  timeblockId: string,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    timeblocks: current.timeblocks.filter((timeblock) => timeblock.id !== timeblockId),
    items: current.items.map((item) => ({
      ...item,
      assignedTimeblockIds: item.assignedTimeblockIds.filter((id) => id !== timeblockId),
    })),
  }
}

export function appendBeverageTimeblock(
  cache: BeverageSectionPayload | undefined,
  timeblock: BeverageSectionPayload["timeblocks"][number],
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    timeblocks: [...current.timeblocks, timeblock],
  }
}

export function updateBeverageTimeblock(
  cache: BeverageSectionPayload | undefined,
  timeblockId: string,
  updates: Partial<BeverageSectionPayload["timeblocks"][number]>,
): BeverageSectionPayload {
  const current = cache ?? { timeblocks: [], items: [] }

  return {
    ...current,
    timeblocks: current.timeblocks.map((timeblock) =>
      timeblock.id === timeblockId ? { ...timeblock, ...updates } : timeblock,
    ),
  }
}
