import type { ReactNode } from "react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { FoodPackageSummary } from "~/features/preview/lib/foodPackages"
import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"
import { FoodPackageCard } from "./FoodPackageCard"

export const FOOD_PACKAGES_CONTINUATION_KEY = "food-packages"

export const foodPackagesContinuationHeading = (
  <h2 className="mb-2 text-lg font-bold">Food Packages (continued)</h2>
)

/**
 * The packages page: a heading, then one block per package. Returns PreviewBlocks
 * (not a component) because PreviewDocument paginates its direct blocks.
 */
export function renderFoodPackagePages(params: {
  packages: FoodPackageSummary[]
  timeblocks: TimeblockWithItems[]
}): ReactNode[] {
  const timeblocksById = new Map(params.timeblocks.map((tb) => [tb.id, tb]))

  return [
    <PreviewBlock
      key="financial-food-packages-header"
      id="financial-food-packages-header"
      continuationKey={FOOD_PACKAGES_CONTINUATION_KEY}
      breakBefore
      keepTogether
    >
      <div>
        <h2 className="text-lg font-bold">Food Packages</h2>
        <p className="mb-4 mt-1 text-sm text-stone-600">
          Food options to choose between. Items priced per person are charged for every guest, so
          package totals follow the guest count. Per-person prices are each package&apos;s total
          divided by the guest count.
        </p>
      </div>
    </PreviewBlock>,
    ...params.packages.map((pkg) => {
      const timeblock = timeblocksById.get(pkg.timeblockId)
      return (
        <PreviewBlock
          key={`financial-food-package-${pkg.timeblockId}`}
          id={`financial-food-package-${pkg.timeblockId}`}
          continuationKey={FOOD_PACKAGES_CONTINUATION_KEY}
          keepTogether
          className="mb-6"
        >
          <FoodPackageCard summary={pkg} timeblock={timeblock} />
        </PreviewBlock>
      )
    }),
  ]
}
