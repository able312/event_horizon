import { useMemo } from "react"

import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { getFinancialDocumentKindLabels } from "~/features/preview/lib/financialDocumentKinds"
import {
  buildFoodPackageEstimateRows,
  computeFoodPackageEstimate,
  resolveGuestCountRange,
  splitFoodPackageTimeblocks,
} from "~/features/preview/lib/foodPackages"
import {
  BEVERAGE_APPENDIX_CONTINUATION_KEY,
  beverageAppendixContinuationHeading,
  renderBeverageAppendixPages,
} from "~/features/preview/pages/financial/BeverageAppendixPages"
import {
  buildChargeTableSpecs,
  groupChargeItemsByCategory,
  renderChargeTableBlocks,
} from "~/features/preview/pages/financial/chargeTables"
import { FinancialHeader } from "~/features/preview/pages/financial/FinancialHeader"
import { FinancialTotals } from "~/features/preview/pages/financial/FinancialTotals"
import {
  FOOD_PACKAGES_CONTINUATION_KEY,
  foodPackagesContinuationHeading,
  renderFoodPackagePages,
} from "~/features/preview/pages/financial/FoodPackagePages"
import { PaymentsTable } from "~/features/preview/pages/financial/PaymentsTable"
import { combineQueryStates } from "~/features/preview/pagination/combineQueryStates"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { filterSelectedIds, isBillableLineItem } from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { usePrimaryClient } from "~/hooks/useEventContacts"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { usePaymentsSection } from "~/hooks/usePaymentsSection"

export default function FinancialPreview() {
  const eventQuery = useEvent()
  const event = eventQuery.data
  const clientQuery = usePrimaryClient(event?.id)
  const chargeQuery = useMenuOfChargeItemsSection()
  const chargeItems = chargeQuery.data
  const foodQuery = useFoodSection()
  const food = foodQuery.data
  const beverageQuery = useBeverageSection()
  const beverageItems = beverageQuery.items
  const paymentsQuery = usePaymentsSection()
  const payments = paymentsQuery.data ?? []
  const queries = combineQueryStates([
    eventQuery,
    clientQuery,
    chargeQuery,
    foodQuery,
    beverageQuery,
    paymentsQuery,
  ])

  const { state } = usePreviewPreferences()
  const prefs = state["financial-report"]

  const chargeItemsByCategory = useMemo(() => groupChargeItemsByCategory(chargeItems), [chargeItems])

  // Food packages: chosen food timeblocks shown as alternatives. Until the one-time default
  // (all food timeblocks) is applied, treat them all as chosen, which is what it selects.
  const availableFoodIds = (food ?? []).map((tb) => tb.id)
  const packageTimeblockIds = prefs.showFoodPackages
    ? state.defaultsApplied.financialFoodPackages
      ? filterSelectedIds(prefs.foodPackageTimeblockIds, availableFoodIds)
      : availableFoodIds
    : null
  const { packages: packageTimeblocks, certain: certainFood } = splitFoodPackageTimeblocks(
    food,
    packageTimeblockIds,
  )
  const packageEstimate = computeFoodPackageEstimate({
    menuItems: chargeItems,
    foodTimeblocks: food,
    beverageItems,
    payments: paymentsQuery.data,
    packageTimeblockIds,
    mode: prefs.foodPackageEstimateMode,
    guests: resolveGuestCountRange(event),
  })

  const chargeTables = buildChargeTableSpecs({
    chargeItemsByCategory,
    billableFoodRows: certainFood.flatMap((timeblock) =>
      (timeblock.foodItems ?? []).filter(isBillableLineItem),
    ),
    billableBeverageRows: beverageItems.filter(isBillableLineItem),
    foodPackageRows: buildFoodPackageEstimateRows(packageEstimate),
  })

  const showAppendix = prefs.showBeverageAppendix && beverageItems.length > 0
  const beverageSections = getVisibleBeverageTypeSections(beverageItems, {
    hideEmptySpecialOrders: true,
  }).filter((section) => section.items.length > 0)

  return (
    <PreviewDocument
      dataError={queries.error}
      dataReady={
        queries.ready &&
        state.defaultsApplied.financialPayments &&
        (!prefs.showFoodPackages || state.defaultsApplied.financialFoodPackages)
      }
      continuationHeadings={{
        [FOOD_PACKAGES_CONTINUATION_KEY]: foodPackagesContinuationHeading,
        [BEVERAGE_APPENDIX_CONTINUATION_KEY]: beverageAppendixContinuationHeading,
      }}
    >
      <PreviewBlock id="financial-header" keepTogether>
        <FinancialHeader
          labels={getFinancialDocumentKindLabels(prefs.documentKind)}
          client={clientQuery.data}
          eventStartDateTime={event?.startDateTime}
        />
      </PreviewBlock>

      {renderChargeTableBlocks(chargeTables)}

      <PreviewBlock id="financial-totals" keepTogether className="mb-6">
        <FinancialTotals
          low={packageEstimate.low}
          high={packageEstimate.high}
          showChargeBreakdown={prefs.showChargeBreakdown}
          showPaymentStatus={prefs.showPaymentStatus && payments.length > 0}
        />
      </PreviewBlock>

      {payments.length > 0 ? (
        <PreviewBlock id="financial-payments" keepTogether className="mb-6">
          <PaymentsTable payments={payments} />
        </PreviewBlock>
      ) : null}

      {packageEstimate.packages.length > 0
        ? renderFoodPackagePages({ packages: packageEstimate.packages, timeblocks: packageTimeblocks })
        : null}

      {showAppendix
        ? renderBeverageAppendixPages({ sections: beverageSections, showNotes: prefs.showBeverageNotes })
        : null}
    </PreviewDocument>
  )
}
