import type { FoodMenuCategory, FoodTemplate, FoodTemplateFields } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId, toIds } from "./ids"
import { createWithClientId, resolveRecordId } from "./optimisticIds"
import { sources } from "./sources"

const EDITABLE_FIELDS = ["name", "unitPriceCents", "pricingBasis", "clientNotes", "internalNotes", "categoryIds"] as const

/** The fields to send, with any category created moments ago resolved to its server ID. */
async function templateFields(values: Partial<FoodTemplateFields>) {
  const { categoryIds, ...fields } = pickFields(values, EDITABLE_FIELDS)
  if (!categoryIds) return fields
  const resolved = await Promise.all(categoryIds.map(resolveRecordId))
  return { ...fields, categoryIds: toIds<"foodMenuCategories">(resolved) }
}

/** Every saved food item on the venue's food menu, oldest first. */
export function getFoodTemplates(): Promise<FoodTemplate[]> {
  return fetchSource(sources.foodTemplates.list())
}

export function createFoodTemplate(
  data: Pick<FoodTemplateFields, "name"> & Partial<FoodTemplateFields> & {
    /** Client ID of the row already shown; the created row gets a server ID (see optimisticIds.ts). */
    id?: string
  },
): Promise<FoodTemplate> {
  return createWithClientId(data.id, async () => runMutation(api.foodTemplates.create, {
    ...(await templateFields(data)),
    name: data.name,
  }))
}

export async function updateFoodTemplate(id: string, updates: Partial<FoodTemplateFields>): Promise<FoodTemplate> {
  return runMutation(api.foodTemplates.update, {
    id: toId<"foodTemplates">(await resolveRecordId(id)),
    updates: await templateFields(updates),
  })
}

export async function deleteFoodTemplate(id: string): Promise<boolean> {
  return runMutation(api.foodTemplates.remove, { id: toId<"foodTemplates">(await resolveRecordId(id)) })
}

/** The food menu's categories, oldest first. */
export function getFoodMenuCategories(): Promise<FoodMenuCategory[]> {
  return fetchSource(sources.foodMenuCategories.list())
}

export function createFoodMenuCategory(data: { id?: string; name: string }): Promise<FoodMenuCategory> {
  return createWithClientId(data.id, () => runMutation(api.foodMenuCategories.create, { name: data.name }))
}

export async function updateFoodMenuCategory(id: string, updates: { name: string }): Promise<FoodMenuCategory> {
  return runMutation(api.foodMenuCategories.update, {
    id: toId<"foodMenuCategories">(await resolveRecordId(id)),
    updates: { name: updates.name },
  })
}

export async function deleteFoodMenuCategory(id: string): Promise<boolean> {
  return runMutation(api.foodMenuCategories.remove, { id: toId<"foodMenuCategories">(await resolveRecordId(id)) })
}
