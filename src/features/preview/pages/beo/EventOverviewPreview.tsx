import {
  SectionFrame,
  SectionFrameHeading,
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
import { renderSectionBlocks } from "./renderSectionBlocks"
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

  // The beverage section prints its timeblocks, then the bar lists, as one framed run.
  const beverageUnits = [
    ...selectedBeverage.map((timeblock) => ({ kind: "timeblock" as const, timeblock })),
    ...beverageBarSections.map((section, index) => ({
      kind: "bar" as const,
      section,
      isFirstBar: index === 0,
    })),
  ]

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
        ? renderSectionBlocks({
            key: "food",
            title: "Food",
            items: selectedFood,
            blockId: (timeblock) => `beo-food-${timeblock.id}`,
            render: (timeblock) => (
              <FoodTimeblockDetails
                timeblock={timeblock}
                showPricing={prefs.showPricing}
                showKitchenNotes={prefs.showKitchenNotes}
              />
            ),
            breakBefore: true,
          })
        : null}

      {showBeverage
        ? renderSectionBlocks({
            key: "beverage",
            title: "Beverage",
            items: beverageUnits,
            blockId: (unit) =>
              unit.kind === "timeblock"
                ? `beo-beverage-${unit.timeblock.id}`
                : `beo-beverage-bar-${unit.section.type}`,
            render: (unit) =>
              unit.kind === "timeblock" ? (
                <BeverageTimeblockDetails timeblock={unit.timeblock} />
              ) : (
                <>
                  {unit.isFirstBar ? <BeverageBarListHeading /> : null}
                  <BeverageTypeSectionList section={unit.section} showPricing={prefs.showPricing} />
                </>
              ),
            breakBefore: true,
          })
        : null}

      {showSetup
        ? renderSectionBlocks({
            key: "setup",
            title: "Setup Instructions",
            items: selectedSetup,
            blockId: (timeblock) => `beo-setup-${timeblock.id}`,
            render: (timeblock) => <SetupInstructionTimeblockDetails timeblock={timeblock} />,
          })
        : null}

      {showNotes
        ? renderSectionBlocks({
            key: "notes",
            title: "Notes",
            items: selectedNotes,
            blockId: (timeblock) => `beo-notes-${timeblock.id}`,
            render: (timeblock) => <NoteTimeblockDetails timeblock={timeblock} />,
          })
        : null}
    </PreviewDocument>
  )
}
