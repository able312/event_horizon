import type { ChargeCategory, MenuOfChargeItem, UpdateMenuOfChargeItem } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

export function getMenuOfChargeItemsByEventId(eventId: string): Promise<MenuOfChargeItem[]> {
  return fetchSource(sources.menuOfChargeItems.byEvent(eventId))
}

export function createMenuOfChargeItem(eventId: string, category?: ChargeCategory | null): Promise<MenuOfChargeItem> {
  return runMutation(api.menuOfChargeItems.create, { eventId: toId<"events">(eventId), category: category ?? null })
}

export function updateMenuOfChargeItem(id: string, updates: UpdateMenuOfChargeItem): Promise<MenuOfChargeItem> {
  return runMutation(api.menuOfChargeItems.update, {
    id: toId<"menuOfChargeItems">(id),
    updates: pickFields(updates, ["name", "quantity", "category", "includes", "unitPriceCents"]),
  })
}

export function deleteMenuOfChargeItem(id: string): Promise<boolean> {
  return runMutation(api.menuOfChargeItems.remove, { id: toId<"menuOfChargeItems">(id) })
}
