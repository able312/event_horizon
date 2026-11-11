import type { BeverageItemType, BeverageTemplate } from "~/definitions/database"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"
import { compareMenuItemNames } from "~/lib/savedMenus/menuItemNames"

// The venue's saved beverages (Settings → Beverage Menu) and how one becomes an
// event's beverage item. The event gets a copy: later edits to the saved beverage
// don't reach events that already used it.

/** The fields a new event beverage item starts with when added from a saved beverage. */
export function beverageMenuItemFields(template: BeverageTemplate) {
  return {
    name: template.name,
    includes: template.notes?.trim() ? template.notes : null,
    unitPriceCents: template.unitPriceCents,
    pricingBasis: template.pricingBasis,
  }
}

export type BeverageMenuGroup = { type: BeverageItemType; templates: BeverageTemplate[] }

/**
 * Saved beverages grouped by type in the usual beverage type order, each group sorted
 * by name. Types with nothing saved are left out unless `includeEmpty` is set
 * (Special Orders is still left out when empty; it's for one-off requests).
 */
export function groupBeverageMenu(
  templates: readonly BeverageTemplate[],
  options?: { includeEmpty?: boolean },
): BeverageMenuGroup[] {
  return ITER_BEVERAGE_TYPE.flatMap((type) => {
    const group = templates
      .filter((template) => template.type === type)
      .sort((a, b) => compareMenuItemNames(a.name, b.name))
    const keepEmpty = options?.includeEmpty && type !== "Special Orders"
    return group.length > 0 || keepEmpty ? [{ type, templates: group }] : []
  })
}
