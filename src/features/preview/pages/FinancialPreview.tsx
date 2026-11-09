import { useMemo } from "react"

import { splitEstimateAddOns } from "~/features/event-detail/workspace/lib/estimateAddOns"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { getFinancialDocumentKindLabels } from "~/features/preview/lib/financialDocumentKinds"
import {
  buildFoodPackageEstimateRows,
  computeFoodPackageEstimate,
  formatGuestCountRange,
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
  renderPerPersonTableBlocks,
} from "~/features/preview/pages/financial/chargeTables"
import { FinancialHeader } from "~/features/preview/pages/financial/FinancialHeader"
import { FinancialTotals, PerPersonTotals } from "~/features/preview/pages/financial/FinancialTotals"
import {
  FOOD_PACKAGES_CONTINUATION_KEY,
  foodPackagesContinuationHeading,
  renderFoodPackagePages,
} from "~/features/preview/pages/financial/FoodPackagePages"
import { PricingSectionHeading } from "~/features/preview/pages/financial/PricingSectionHeading"
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
  // Optional add-ons print in their own table and count only toward the high end of the totals.
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
    addOns,
  })

  const chargeTables = buildChargeTableSpecs({
    chargeItemsByCategory,
    billableFoodRows: buildEstimateFoodRows(certainFood),
    billableBeverageRows: beverageItems.filter(isEstimateBillableLineItem),
    foodPackageRows: buildFoodPackageEstimateRows(packageEstimate),
    perPersonGuests: guests,
  })

  const showTotal = prefs.showTotalPricing
  const showPerPerson = prefs.showPerPersonPricing
  // Headings only matter once the per-person view is on: alone, or as the second of two sections.
  const totalHeading = showPerPerson ? (
    <PricingSectionHeading title="Event Total" description="Your estimate for the event as a whole." />
  ) : null
  const perPersonHeading = (
    <PricingSectionHeading
      title="Per Person"
      description={
        guests
          ? `The same estimate divided by your guest count (${formatGuestCountRange(guests)}). Fixed-price items are shared among your guests, so they cost each guest less the more guests attend.`
          : "The same estimate divided by your guest count."
      }
      spaced={showTotal}
    />
  )

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

      {showTotal ? renderChargeTableBlocks(chargeTables, totalHeading) : null}

      {showTotal ? (
        <PreviewBlock id="financial-totals" keepTogether className="mb-6">
          {chargeTables.length === 0 ? totalHeading : null}
          <FinancialTotals
            low={packageEstimate.low}
            high={packageEstimate.high}
            showChargeBreakdown={prefs.showChargeBreakdown}
            rangeNote={packageEstimate.rangeNote}
          />
        </PreviewBlock>
      ) : null}

      {showPerPerson && guests ? renderPerPersonTableBlocks(chargeTables, guests, perPersonHeading) : null}

      {showPerPerson ? (
        <PreviewBlock id="financial-per-person-totals" keepTogether className="mb-6">
          {!guests || chargeTables.length === 0 ? perPersonHeading : null}
          {packageEstimate.perGuest ? (
            <PerPersonTotals
              low={packageEstimate.perGuest.low}
              high={packageEstimate.perGuest.high}
              showChargeBreakdown={prefs.showChargeBreakdown}
              rangeNote={packageEstimate.perGuest.rangeNote}
            />
          ) : (
            <p className="text-sm italic text-stone-600">
              Per-person pricing appears once the event has a guest count.
            </p>
          )}
        </PreviewBlock>
      ) : null}

      {addOns.length > 0 ? (
        <PreviewBlock id="financial-add-ons" keepTogether className="mb-6">
          <AddOnsTable addOns={addOns} guests={guests} showTotal={showTotal} showPerPerson={showPerPerson} />
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
        ? renderFoodPackagePages({
            packages: packageEstimate.packages,
            timeblocks: packageTimeblocks,
            showTotal,
            showPerPerson,
          })
        : null}

      {showAppendix
        ? renderBeverageAppendixPages({ sections: beverageSections, showNotes: prefs.showBeverageNotes })
        : null}
    </PreviewDocument>
  )
}
