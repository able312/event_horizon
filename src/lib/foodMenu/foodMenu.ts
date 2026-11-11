import type { FoodItem, FoodMenuCategory, FoodTemplate } from "~/definitions/database"
import { compareMenuItemNames } from "~/lib/savedMenus/menuItemNames"

// The venue's saved food items (Settings → Food Menu), their categories, and how one
// becomes an event's food item. The event gets a copy: later edits to the saved item
// don't reach events that already used it.

/** The fields a new food item starts with when added from a saved food item. */
export function foodMenuItemFields(
  template: FoodTemplate,
): Pick<FoodItem, "name" | "clientNotes" | "internalNotes" | "unitPriceCents" | "pricingBasis"> {
  return {
    name: template.name,
    clientNotes: template.clientNotes?.trim() ? template.clientNotes : null,
    internalNotes: template.internalNotes?.trim() ? template.internalNotes : null,
    unitPriceCents: template.unitPriceCents,
    pricingBasis: template.pricingBasis,
  }
}

export function sortByName<T extends { name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => compareMenuItemNames(a.name, b.name))
}

/** A category of saved food items; `category` is null for items with none. */
export type FoodMenuGroup = { category: FoodMenuCategory | null; templates: FoodTemplate[] }

/**
 * Saved food items grouped by category, categories by name, items by name. An item
 * with several categories appears under each; items with none (or only deleted ones)
 * come last under `category: null`. Empty categories are left out.
 */
export function groupFoodMenu(
  templates: readonly FoodTemplate[],
  categories: readonly FoodMenuCategory[],
): FoodMenuGroup[] {
  const sorted = sortByName(templates)
  const knownIds = new Set(categories.map((category) => category.id))

  const groups: FoodMenuGroup[] = sortByName(categories).flatMap((category) => {
    const inCategory = sorted.filter((template) => template.categoryIds.includes(category.id))
    return inCategory.length > 0 ? [{ category, templates: inCategory }] : []
  })
  const uncategorized = sorted.filter((template) => !template.categoryIds.some((id) => knownIds.has(id)))
  return uncategorized.length > 0 ? [...groups, { category: null, templates: uncategorized }] : groups
}

/** "all" shows every item; "none" shows items without a category; otherwise a category ID. */
export type FoodMenuFilter = "all" | "none" | string

/** The saved items the Settings table shows for a category filter, sorted by name. */
export function filterFoodMenu(
  templates: readonly FoodTemplate[],
  categories: readonly FoodMenuCategory[],
  filter: FoodMenuFilter,
): FoodTemplate[] {
  if (filter === "all") return sortByName(templates)
  if (filter === "none") {
    const knownIds = new Set(categories.map((category) => category.id))
    return sortByName(templates.filter((template) => !template.categoryIds.some((id) => knownIds.has(id))))
  }
  return sortByName(templates.filter((template) => template.categoryIds.includes(filter)))
}

/** The category a new row starts with under a filter, so it stays visible once added. */
export function categoryIdsForNewItem(filter: FoodMenuFilter): string[] {
  return filter === "all" || filter === "none" ? [] : [filter]
}

/** Adds or removes one category from an item's tags, keeping the rest in order. */
export function toggleCategoryId(categoryIds: readonly string[], categoryId: string, checked: boolean): string[] {
  if (checked) return categoryIds.includes(categoryId) ? [...categoryIds] : [...categoryIds, categoryId]
  return categoryIds.filter((id) => id !== categoryId)
}
