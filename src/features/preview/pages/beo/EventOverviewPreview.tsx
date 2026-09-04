import {
  SectionFrame,
  SectionFrameHeading,
  SectionFrameItem,
} from "~/features/preview/components/SectionFrame"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  hasBeverageSectionContent,
  sortTimeblocksByTime,
} from "~/features/preview/preferences/selectors"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { useVendorSection } from "~/hooks/useVendorSection"
import { PrintHeader } from "./EventOverviewHeader"
import {
  BeverageBarListHeading,
  BeverageTimeblockDetails,
  BeverageTypeSectionList,
} from "./sections/BeverageDetails"
import { CartDetails } from "./sections/CartDetails"
import { FoodTimeblockDetails } from "./sections/FoodDetails"
import { NoteTimeblockDetails } from "./sections/NoteDetails"
import { SetupInstructionTimeblockDetails } from "./sections/SetupInstructionDetails"
import { TournamentDetails } from "./sections/TournamentDetails"
import { VendorTimeblockDetails } from "./sections/VendorDetails"

export function EventOverviewPreview() {
  const { data: event } = useEvent()
  const { state } = usePreviewPreferences()
  const prefs = state.beo

  const { data: food } = useFoodSection()
  const { timeblocks: beverageTimeblocks, items: beverageItems } = useBeverageSection()
  const { data: vendors } = useVendorSection()
  const { data: setup } = useSetupInstructionSection()
  const { data: notes } = useNoteSection()

  if (!event) return <p>No event data found.</p>

  const availableFoodIds = (food ?? []).map((tb) => tb.id)
  const availableBeverageIds = beverageTimeblocks.map((tb) => tb.id)
  const availableVendorIds = (vendors ?? []).map((tb) => tb.id)
  const availableSetupIds = (setup ?? []).map((tb) => tb.id)
  const availableNoteIds = (notes ?? []).map((tb) => tb.id)

  // Until one-time defaults are applied, treat all available timeblocks as selected.
  const selectedFoodIds = state.defaultsApplied.beoTimeblocks
    ? filterSelectedIds(prefs.selectedTimeblockIds.food, availableFoodIds)
    : availableFoodIds
  const selectedBeverageIds = state.defaultsApplied.beoTimeblocks
    ? filterSelectedIds(prefs.selectedTimeblockIds.beverage, availableBeverageIds)
    : availableBeverageIds
  const selectedVendorIds = state.defaultsApplied.beoTimeblocks
    ? filterSelectedIds(prefs.selectedTimeblockIds.vendors, availableVendorIds)
    : availableVendorIds
  const selectedSetupIds = state.defaultsApplied.beoTimeblocks
    ? filterSelectedIds(prefs.selectedTimeblockIds.setup, availableSetupIds)
    : availableSetupIds
  const selectedNoteIds = state.defaultsApplied.beoTimeblocks
    ? filterSelectedIds(prefs.selectedTimeblockIds.notes, availableNoteIds)
    : availableNoteIds

  const isTournament = event.type === "tournament"
  const showTournament = isTournament && prefs.sections.tournament
  const showCart = isTournament && prefs.sections.cart

  const selectedFood = sortTimeblocksByTime(food).filter((tb) =>
    selectedFoodIds.includes(tb.id),
  )
  const selectedBeverage = sortTimeblocksByTime(beverageTimeblocks).filter((tb) =>
    selectedBeverageIds.includes(tb.id),
  )
  const selectedVendors = sortTimeblocksByTime(vendors).filter((tb) =>
    selectedVendorIds.includes(tb.id),
  )
  const selectedSetup = sortTimeblocksByTime(setup).filter((tb) =>
    selectedSetupIds.includes(tb.id),
  )
  const selectedNotes = sortTimeblocksByTime(notes).filter((tb) =>
    selectedNoteIds.includes(tb.id),
  )

  const beverageBarSections = getVisibleBeverageTypeSections(beverageItems, {
    hideEmptySpecialOrders: true,
  }).filter((section) => section.items.length > 0)

  const showVendors = prefs.sections.vendors && selectedVendors.length > 0
  const showFood = prefs.sections.food && selectedFood.length > 0
  const showBeverage =
    prefs.sections.beverage &&
    hasBeverageSectionContent({
      timeblocks: selectedBeverage,
      items: beverageItems,
    })
  const showSetup = prefs.sections.setup && selectedSetup.length > 0
  const showNotes = prefs.sections.notes && selectedNotes.length > 0

  const beverageUnitCount = selectedBeverage.length + beverageBarSections.length

  return (
    <PreviewDocument
      continuationHeadings={{
        vendors: <SectionFrameHeading title="Vendor Details (continued)" />,
        food: <SectionFrameHeading title="Food (continued)" />,
        beverage: <SectionFrameHeading title="Beverage (continued)" />,
        setup: <SectionFrameHeading title="Setup Instructions (continued)" />,
        notes: <SectionFrameHeading title="Notes (continued)" />,
      }}
    >
      <PreviewBlock id="beo-overview" keepTogether>
        <PrintHeader
          event={event}
          showContactInfo={prefs.showContactInfo}
          showInternalNotes={prefs.showInternalNotes}
        />
      </PreviewBlock>

      {showVendors
        ? selectedVendors.map((vendor, index) => {
            const isFirst = index === 0
            const isLast = index === selectedVendors.length - 1
            return (
              <PreviewBlock
                key={`beo-vendor-${vendor.id}`}
                id={`beo-vendor-${vendor.id}`}
                continuationKey="vendors"
              >
                {isFirst ? <SectionFrameHeading title="Vendor Details" /> : null}
                <SectionFrameItem isLast={isLast}>
                  <VendorTimeblockDetails vendor={vendor} />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })
        : null}

      {showTournament ? (
        <PreviewBlock id="beo-tournament" breakBefore keepTogether>
          <SectionFrame title="Tournament Details">
            <TournamentDetails />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showCart ? (
        <PreviewBlock id="beo-cart" breakBefore={!showTournament} keepTogether>
          <SectionFrame title="Cart Details">
            <CartDetails />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showFood
        ? selectedFood.map((timeblock, index) => {
            const isFirst = index === 0
            const isLast = index === selectedFood.length - 1
            return (
              <PreviewBlock
                key={`beo-food-${timeblock.id}`}
                id={`beo-food-${timeblock.id}`}
                breakBefore={isFirst}
                continuationKey="food"
              >
                {isFirst ? <SectionFrameHeading title="Food" /> : null}
                <SectionFrameItem isLast={isLast}>
                  <FoodTimeblockDetails
                    timeblock={timeblock}
                    showPricing={prefs.showPricing}
                  />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })
        : null}

      {showBeverage ? (
        <>
          {selectedBeverage.map((timeblock, index) => {
            const isFirst = index === 0
            const isLastOverall = index === beverageUnitCount - 1
            return (
              <PreviewBlock
                key={`beo-beverage-${timeblock.id}`}
                id={`beo-beverage-${timeblock.id}`}
                breakBefore={isFirst}
                continuationKey="beverage"
              >
                {isFirst ? <SectionFrameHeading title="Beverage" /> : null}
                <SectionFrameItem isLast={isLastOverall}>
                  <BeverageTimeblockDetails timeblock={timeblock} />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })}
          {beverageBarSections.map((section, index) => {
            const unitIndex = selectedBeverage.length + index
            const isFirst = unitIndex === 0
            const isFirstBar = index === 0
            const isLast = unitIndex === beverageUnitCount - 1
            return (
              <PreviewBlock
                key={`beo-beverage-bar-${section.type}`}
                id={`beo-beverage-bar-${section.type}`}
                breakBefore={isFirst}
                continuationKey="beverage"
              >
                {isFirst ? <SectionFrameHeading title="Beverage" /> : null}
                <SectionFrameItem isLast={isLast}>
                  {isFirstBar ? <BeverageBarListHeading /> : null}
                  <BeverageTypeSectionList
                    section={section}
                    showPricing={prefs.showPricing}
                  />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })}
        </>
      ) : null}

      {showSetup
        ? selectedSetup.map((timeblock, index) => {
            const isFirst = index === 0
            const isLast = index === selectedSetup.length - 1
            return (
              <PreviewBlock
                key={`beo-setup-${timeblock.id}`}
                id={`beo-setup-${timeblock.id}`}
                continuationKey="setup"
              >
                {isFirst ? <SectionFrameHeading title="Setup Instructions" /> : null}
                <SectionFrameItem isLast={isLast}>
                  <SetupInstructionTimeblockDetails timeblock={timeblock} />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })
        : null}

      {showNotes
        ? selectedNotes.map((timeblock, index) => {
            const isFirst = index === 0
            const isLast = index === selectedNotes.length - 1
            return (
              <PreviewBlock
                key={`beo-notes-${timeblock.id}`}
                id={`beo-notes-${timeblock.id}`}
                continuationKey="notes"
              >
                {isFirst ? <SectionFrameHeading title="Notes" /> : null}
                <SectionFrameItem isLast={isLast}>
                  <NoteTimeblockDetails timeblock={timeblock} />
                </SectionFrameItem>
              </PreviewBlock>
            )
          })
        : null}
    </PreviewDocument>
  )
}
