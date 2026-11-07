import { useMemo } from "react"

import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
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
import { AddOnsTable } from "~/features/preview/pages/financial/AddOnsTable"
import {
  buildChargeTableSpecs,
  buildEstimateFoodRows,
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
import {
  EstimateDeposit,
  EstimateIntroNote,
  renderEstimateTermsBlocks,
} from "~/features/preview/pages/financial/ProposalBlocks"
import {
  formatDeposit,
  formatProposalDate,
  resolveEstimateTerms,
} from "~/features/preview/lib/estimateProposal"
import { combineQueryStates } from "~/features/preview/pagination/combineQueryStates"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { filterSelectedIds, isEstimateBillableLineItem } from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEstimateDetailsSection } from "~/hooks/useEstimateDetailsSection"
import { useEvent } from "~/hooks/useEvent"
import { usePrimaryClient } from "~/hooks/useEventContacts"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import { useVenueSettings } from "~/hooks/useVenueSettings"

export default function FinancialPreview() {
  const eventQuery = useEvent()
  const event = eventQuery.data
  const clientQuery = usePrimaryClient(event?.id)
  const chargeQuery = useMenuOfChargeItemsSection()
  const chargeItems = chargeQuery.data
  const foodQuery = useFoodSection()
  const beverageQuery = useBeverageSection()
  // Optional add-ons print in their own table and stay out of everything else, packages included.
  const { foodTimeblocks: food, beverageItems, addOns } = splitEstimateAddOns(foodQuery.data, beverageQuery.items)
  const estimateDetailsQuery = useEstimateDetailsSection()
  const estimateDetails = estimateDetailsQuery.data
  const venueSettingsQuery = useVenueSettings()
  const queries = combineQueryStates([
    eventQuery,
    clientQuery,
    chargeQuery,
    foodQuery,
    beverageQuery,
    estimateDetailsQuery,
    venueSettingsQuery,
  ])

  const { state } = usePreviewPreferences()
  const prefs = state["financial-report"]

  const chargeItemsByCategory = useMemo(() => groupChargeItemsByCategory(chargeItems), [chargeItems])

  // Food packages: chosen food timeblocks shown as alternatives. Until the one-time default
  // (all food timeblocks) is applied, treat them all as chosen, which is what it selects.
  const availableFoodIds = food.map((tb) => tb.id)
  const packageTimeblockIds = prefs.showFoodPackages
    ? state.defaultsApplied.financialFoodPackages
      ? filterSelectedIds(prefs.foodPackageTimeblockIds, availableFoodIds)
      : availableFoodIds
    : null
  const { packages: packageTimeblocks, certain: certainFood } = splitFoodPackageTimeblocks(
    food,
    packageTimeblockIds,
  )
  const guests = resolveGuestCountRange(event)
  const packageEstimate = computeFoodPackageEstimate({
    menuItems: chargeItems,
    foodTimeblocks: food,
    beverageItems,
    packageTimeblockIds,
    mode: prefs.foodPackageEstimateMode,
    guests,
  })

  const chargeTables = buildChargeTableSpecs({
    chargeItemsByCategory,
    billableFoodRows: buildEstimateFoodRows(certainFood),
    billableBeverageRows: beverageItems.filter(isEstimateBillableLineItem),
    foodPackageRows: buildFoodPackageEstimateRows(packageEstimate),
    perPersonGuests: guests,
  })

  const introNote = estimateDetails?.introNote?.trim() ?? ""
  const deposit = formatDeposit(estimateDetails, {
    lowCents: packageEstimate.low.grandTotalCents,
    highCents: packageEstimate.high.grandTotalCents,
  })
  const terms = resolveEstimateTerms(estimateDetails, venueSettingsQuery.data?.defaultEstimateTerms)

  const showAppendix = prefs.showBeverageAppendix && beverageItems.length > 0
  const beverageSections = getVisibleBeverageTypeSections(beverageItems, {
    hideEmptySpecialOrders: true,
  }).filter((section) => section.items.length > 0)

  return (
    <PreviewDocument
      dataError={queries.error}
      dataReady={
        queries.ready &&
        (!prefs.showFoodPackages || state.defaultsApplied.financialFoodPackages)
      }
      continuationHeadings={{
        [FOOD_PACKAGES_CONTINUATION_KEY]: foodPackagesContinuationHeading,
        [BEVERAGE_APPENDIX_CONTINUATION_KEY]: beverageAppendixContinuationHeading,
      }}
    >
      <PreviewBlock id="financial-header" keepTogether>
        <FinancialHeader
          labels={getFinancialDocumentKindLabels("estimate")}
          client={clientQuery.data}
          eventStartDateTime={event?.startDateTime}
          validUntil={formatProposalDate(estimateDetails?.validUntil)}
        />
      </PreviewBlock>

      {introNote ? (
        <PreviewBlock id="financial-intro">
          <EstimateIntroNote note={introNote} />
        </PreviewBlock>
      ) : null}

      {renderChargeTableBlocks(chargeTables)}

      <PreviewBlock id="financial-totals" keepTogether className="mb-6">
        <FinancialTotals
          low={packageEstimate.low}
          high={packageEstimate.high}
          showChargeBreakdown={prefs.showChargeBreakdown}
          rangeNote={packageEstimate.rangeNote}
        />
      </PreviewBlock>

      {addOns.length > 0 ? (
        <PreviewBlock id="financial-add-ons" keepTogether className="mb-6">
          <AddOnsTable addOns={addOns} guests={guests} />
        </PreviewBlock>
      ) : null}

      {deposit ? (
        <PreviewBlock id="financial-deposit" keepTogether className="mb-6">
          <EstimateDeposit
            amount={deposit}
            dueDate={formatProposalDate(estimateDetails?.depositDueDate)}
            note={estimateDetails?.depositNote?.trim() || null}
          />
        </PreviewBlock>
      ) : null}

      {renderEstimateTermsBlocks(terms)}

      {packageEstimate.packages.length > 0
        ? renderFoodPackagePages({ packages: packageEstimate.packages, timeblocks: packageTimeblocks })
        : null}

      {showAppendix
        ? renderBeverageAppendixPages({ sections: beverageSections, showNotes: prefs.showBeverageNotes })
        : null}
    </PreviewDocument>
  )
}
