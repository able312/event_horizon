import type { BeverageItemType } from "~/definitions/database"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"

export function getVisibleBeverageTypeSections<T extends { type: BeverageItemType }>(
  items: T[],
  options?: { hideEmptySpecialOrders?: boolean },
): Array<{ type: BeverageItemType; items: T[] }> {
  const hideEmptySpecialOrders = options?.hideEmptySpecialOrders ?? true

  return ITER_BEVERAGE_TYPE.flatMap((type) => {
    const typeItems = items.filter((item) => item.type === type)

    if (type === "Special Orders" && hideEmptySpecialOrders && typeItems.length === 0) {
      return []
    }

    return [{ type, items: typeItems }]
  })
}
