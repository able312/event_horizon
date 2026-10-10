import type { BeverageItem, BeverageItemType } from "~/definitions/database"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickItemFields, runMutation } from "./backend"
import { toId, toIds } from "./ids"
import { createWithClientId, resolveRecordId } from "./optimisticIds"
import { sources } from "./sources"

const EDITABLE_FIELDS = ["name", "quantity", "type", "serviceStyle", "includes", "unitPriceCents"] as const

type NewBeverageItemInput = {
  /** Client ID of the row already shown; the created item gets a server ID (see optimisticIds.ts). */
  id?: string
  eventId: string
  name: string
  type: BeverageItemType
  quantity?: number
  serviceStyle?: BeverageItem["serviceStyle"]
  includes?: string
  unitPriceCents?: number
}

export function getBeverageSectionWithItems(eventId: string): Promise<BeverageSectionPayload> {
  return fetchSource(sources.timeblocks.beverageSection(eventId))
}

export function createBeverageItem(data: NewBeverageItemInput): Promise<BeverageItem> {
  return createWithClientId(data.id, () => runMutation(api.beverageItems.create, {
    ...pickItemFields(data, EDITABLE_FIELDS),
    eventId: toId<"events">(data.eventId),
    name: data.name,
    type: data.type,
  }))
}

export function createBeverageItemAssignedToTimeblock(
  data: NewBeverageItemInput & { timeblockId: string },
): Promise<BeverageItemWithAssignments> {
  return createWithClientId(data.id, () => runMutation(api.beverageItems.createAssignedToTimeblock, {
    ...pickItemFields(data, EDITABLE_FIELDS),
    eventId: toId<"events">(data.eventId),
    name: data.name,
    type: data.type,
    timeblockId: toId<"timeblocks">(data.timeblockId),
  }))
}

export async function updateBeverageItem(id: string, updates: {
  name?: string
  quantity?: number | null
  type?: BeverageItemType
  serviceStyle?: BeverageItem["serviceStyle"]
  includes?: string | null
  unitPriceCents?: number | null
}): Promise<BeverageItem> {
  return runMutation(api.beverageItems.update, {
    id: toId<"beverageItems">(await resolveRecordId(id)),
    updates: pickItemFields(updates, EDITABLE_FIELDS),
  })
}

export async function deleteBeverageItem(id: string): Promise<boolean> {
  return runMutation(api.beverageItems.remove, { id: toId<"beverageItems">(await resolveRecordId(id)) })
}

export async function setBeverageItemTimeblocks(
  itemId: string,
  timeblockIds: string[],
): Promise<{ itemId: string; timeblockIds: string[] }> {
  return runMutation(api.beverageItems.setItemTimeblocks, {
    itemId: toId<"beverageItems">(await resolveRecordId(itemId)),
    timeblockIds: toIds<"timeblocks">(timeblockIds),
  })
}
