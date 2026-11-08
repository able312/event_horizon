import type { Event } from "~/definitions/database"
import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { computeEstimateSummaryRange } from "~/features/event-detail/workspace/lib/financial"
import { resolveGuestCountRange } from "~/features/preview/lib/foodPackages"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"

/** The estimate's low and high totals for the event's guest range. Optional add-ons are left out. */
export function useEstimateTotals(event: Event | undefined) {
  const guests = resolveGuestCountRange(event)
  const { data: menuItems } = useMenuOfChargeItemsSection()
  const { data: foodTimeblocks } = useFoodSection()
  const { items: beverageItems } = useBeverageSection()

  const counted = splitEstimateAddOns(foodTimeblocks, beverageItems)
  const { low, high } = computeEstimateSummaryRange({
    menuItems,
    foodTimeblocks: counted.foodTimeblocks,
    beverageItems: counted.beverageItems,
    guests,
  })
  return { guests, low, high }
}
