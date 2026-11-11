import type { BeverageTemplate, BeverageTemplateFields } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId } from "./ids"
import { createWithClientId, resolveRecordId } from "./optimisticIds"
import { sources } from "./sources"

const EDITABLE_FIELDS = ["name", "type", "unitPriceCents", "pricingBasis", "notes"] as const

/** Every saved beverage on the venue's beverage menu, oldest first. */
export function getBeverageTemplates(): Promise<BeverageTemplate[]> {
  return fetchSource(sources.beverageTemplates.list())
}

export function createBeverageTemplate(
  data: Pick<BeverageTemplateFields, "name" | "type"> & Partial<BeverageTemplateFields> & {
    /** Client ID of the row already shown; the created row gets a server ID (see optimisticIds.ts). */
    id?: string
  },
): Promise<BeverageTemplate> {
  return createWithClientId(data.id, () => runMutation(api.beverageTemplates.create, {
    ...pickFields(data, EDITABLE_FIELDS),
    name: data.name,
    type: data.type,
  }))
}

export async function updateBeverageTemplate(id: string, updates: Partial<BeverageTemplateFields>): Promise<BeverageTemplate> {
  return runMutation(api.beverageTemplates.update, {
    id: toId<"beverageTemplates">(await resolveRecordId(id)),
    updates: pickFields(updates, EDITABLE_FIELDS),
  })
}

export async function deleteBeverageTemplate(id: string): Promise<boolean> {
  return runMutation(api.beverageTemplates.remove, { id: toId<"beverageTemplates">(await resolveRecordId(id)) })
}
