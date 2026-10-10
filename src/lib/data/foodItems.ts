import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickItemFields, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

const EDITABLE_FIELDS = ["name", "quantity", "serviceStyle", "includes", "unitPriceCents"] as const

type FoodItemValues = {
  name?: string
  quantity?: number
  serviceStyle?: FoodItem["serviceStyle"]
  includes?: string
  unitPriceCents?: number
}

export function getFoodSectionWithItems(eventId: string): Promise<TimeblockWithItems[]> {
  return fetchSource(sources.timeblocks.foodSection(eventId))
}

export function createFoodItem(data: FoodItemValues & { timeblockId: string; name: string }): Promise<FoodItem> {
  return runMutation(api.foodItems.create, {
    ...pickItemFields(data, EDITABLE_FIELDS),
    timeblockId: toId<"timeblocks">(data.timeblockId),
    name: data.name,
  })
}

export function updateFoodItem(id: string, updates: FoodItemValues): Promise<FoodItem> {
  return runMutation(api.foodItems.update, { id: toId<"foodItems">(id), updates: pickItemFields(updates, EDITABLE_FIELDS) })
}

export function deleteFoodItem(id: string): Promise<boolean> {
  return runMutation(api.foodItems.remove, { id: toId<"foodItems">(id) })
}
