import type { FoodMenuCategory, FoodTemplate, FoodTemplateFields } from "~/definitions/database"
import * as foodTemplatesApi from "~/lib/data/foodTemplates"
import { foodTemplateQueries } from "~/lib/data/queries"

import { useOptimisticRecordList } from "./util/useOptimisticRecordList"

/** The venue's saved food items (Settings → Food Menu), kept live, with optimistic edits. */
export function useFoodTemplates() {
  const { records, add, update, remove, ...query } = useOptimisticRecordList({
    listQuery: foodTemplateQueries.list(),
    create: ({ id, categoryIds }: { id: string; categoryIds: string[] }) =>
      foodTemplatesApi.createFoodTemplate({ id, name: "", categoryIds }),
    optimisticRecord: ({ id, categoryIds }): FoodTemplate => ({
      id, name: "", unitPriceCents: null, pricingBasis: "each", clientNotes: null, internalNotes: null,
      categoryIds, createdAt: new Date().toISOString(),
    }),
    update: (id, updates: Partial<FoodTemplateFields>) => foodTemplatesApi.updateFoodTemplate(id, updates),
    remove: foodTemplatesApi.deleteFoodTemplate,
    errorMessages: { add: "Failed to add food item", save: "Failed to save food item", remove: "Failed to delete food item" },
  })

  return { ...query, templates: records, addTemplate: add, updateTemplate: update, removeTemplate: remove }
}

/** The food menu's categories, kept live, with optimistic edits. */
export function useFoodMenuCategories() {
  const { records, add, update, remove, ...query } = useOptimisticRecordList({
    listQuery: foodTemplateQueries.categories(),
    create: foodTemplatesApi.createFoodMenuCategory,
    optimisticRecord: ({ id, name }: { id: string; name: string }): FoodMenuCategory => ({ id, name: name.trim(), createdAt: new Date().toISOString() }),
    update: (id, updates: { name: string }) => foodTemplatesApi.updateFoodMenuCategory(id, updates),
    remove: foodTemplatesApi.deleteFoodMenuCategory,
    errorMessages: { add: "Failed to add category", save: "Failed to rename category", remove: "Failed to delete category" },
  })

  return { ...query, categories: records, addCategory: add, renameCategory: update, removeCategory: remove }
}
