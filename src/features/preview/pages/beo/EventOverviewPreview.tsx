import {
  SectionFrame,
  SectionFrameHeading,
  SectionFrameItem,
} from "~/features/preview/components/SectionFrame"
import { combineQueryStates } from "~/features/preview/pagination/combineQueryStates"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import type { BeoTimeblockSectionId } from "~/features/preview/preferences/types"
import {
  filterSelectedIds,
  hasBeverageSectionContent,
  sortTimeblocksByTime,
} from "~/features/preview/preferences/selectors"
import { getVisibleBeverageTypeSections } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/beverageTypeSections"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useTournamentDetailsSection } from "~/hooks/useTournamentDetailsSection"
import { useCartDetailsSection } from "~/hooks/useCartDetailsSection"
import { usePrintableContactGroups } from "~/hooks/useEventContacts"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
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

export function EventOverviewPreview() {
  const eventQuery = useEvent()
  const event = eventQuery.data
  const { state } = usePreviewPreferences()
  const prefs = state.beo

  const foodQuery = useFoodSection()
  const food = foodQuery.data
  const beverageQuery = useBeverageSection()
  const { timeblocks: beverageTimeblocks, items: beverageItems } = beverageQuery
  const setupQuery = useSetupInstructionSection()
  const setup = setupQuery.data
  const notesQuery = useNoteSection()
  const notes = notesQuery.data

  const isTournament = event?.type === "tournament"
  const showTournament = isTournament && prefs.sections.tournament
  const showCart = isTournament && prefs.sections.cart
  const tournament = useTournamentDetailsSection(showTournament)
  const cart = useCartDetailsSection(showCart)

  const contacts = usePrintableContactGroups(event?.id)
  const queries = combineQueryStates([
    contacts,
    eventQuery,
    prefs.sections.food && foodQuery,
    prefs.sections.beverage && beverageQuery,
    prefs.sections.setup && setupQuery,
    prefs.sections.notes && notesQuery,
    showTournament && tournament,
    showCart && cart,
  ])

  if (!event) return <p>No event data found.</p>

  const availableFoodIds = (food ?? []).map((tb) => tb.id)
  const availableBeverageIds = beverageTimeblocks.map((tb) => tb.id)
  const availableSetupIds = (setup ?? []).map((tb) => tb.id)
  const availableNoteIds = (notes ?? []).map((tb) => tb.id)

  // Until a section's one-time default is applied, treat all its available timeblocks as
  // selected; that is exactly what the default selects, so readiness need not wait for it.
  const selectedIdsFor = (section: BeoTimeblockSectionId, availableIds: string[]) =>
    state.defaultsApplied.beoTimeblocks[section]
      ? filterSelectedIds(prefs.selectedTimeblockIds[section], availableIds)
      : availableIds
  const selectedFoodIds = selectedIdsFor("food", availableFoodIds)
  const selectedBeverageIds = selectedIdsFor("beverage", availableBeverageIds)
  const selectedSetupIds = selectedIdsFor("setup", availableSetupIds)
  const selectedNoteIds = selectedIdsFor("notes", availableNoteIds)

  const selectedFood = sortTimeblocksByTime(food).filter((tb) =>
    selectedFoodIds.includes(tb.id),
  )
  const selectedBeverage = sortTimeblocksByTime(beverageTimeblocks).filter((tb) =>
    selectedBeverageIds.includes(tb.id),
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
      dataError={queries.error}
      dataReady={queries.ready}
      continuationHeadings={{
        food: <SectionFrameHeading title="Food (continued)" />,
        beverage: <SectionFrameHeading title="Beverage (continued)" />,
        setup: <SectionFrameHeading title="Setup Instructions (continued)" />,
        notes: <SectionFrameHeading title="Notes (continued)" />,
      }}
    >
      <PreviewBlock id="beo-overview" keepTogether>
        <PrintHeader
          event={event}
          contactGroups={contacts.data}
          showContactInfo={prefs.showContactInfo}
          showInternalNotes={prefs.showInternalNotes}
        />
      </PreviewBlock>

      {showTournament ? (
        <PreviewBlock id="beo-tournament" breakBefore keepTogether>
          <SectionFrame title="Tournament Details">
            <TournamentDetails details={tournament.data} />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showCart ? (
        <PreviewBlock id="beo-cart" breakBefore={!showTournament} keepTogether>
          <SectionFrame title="Cart Details">
            <CartDetails details={cart.data} />
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
                    showKitchenNotes={prefs.showKitchenNotes}
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
