import type { BeverageItemType, BeverageTemplate, BeverageTemplateFields } from "~/definitions/database"
import * as beverageTemplatesApi from "~/lib/data/beverageTemplates"
import { beverageTemplateQueries } from "~/lib/data/queries"

import { useOptimisticRecordList } from "./util/useOptimisticRecordList"

/** The venue's saved beverages (Settings → Beverage Menu), kept live, with optimistic edits. */
export function useBeverageTemplates() {
  const { records, add, update, remove, ...query } = useOptimisticRecordList({
    listQuery: beverageTemplateQueries.list(),
    create: ({ id, type }: { id: string; type: BeverageItemType }) =>
      beverageTemplatesApi.createBeverageTemplate({ id, name: "", type }),
    optimisticRecord: ({ id, type }): BeverageTemplate => ({
      id, name: "", type, unitPriceCents: null, pricingBasis: "each", notes: null, createdAt: new Date().toISOString(),
    }),
    update: (id, updates: Partial<BeverageTemplateFields>) => beverageTemplatesApi.updateBeverageTemplate(id, updates),
    remove: beverageTemplatesApi.deleteBeverageTemplate,
    errorMessages: { add: "Failed to add beverage", save: "Failed to save beverage", remove: "Failed to delete beverage" },
  })

  return { ...query, templates: records, addTemplate: add, updateTemplate: update, removeTemplate: remove }
}
