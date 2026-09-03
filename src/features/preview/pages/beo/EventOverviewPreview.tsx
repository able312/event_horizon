import { PrintHeader } from "./EventOverviewHeader"
import { SectionFrame } from "~/features/preview/components/SectionFrame"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  hasBeverageSectionContent,
} from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { useVendorSection } from "~/hooks/useVendorSection"
import { BeverageDetails } from "./sections/BeverageDetails"
import { CartDetails } from "./sections/CartDetails"
import { FoodDetails } from "./sections/FoodDetails"
import { NoteDetails } from "./sections/NoteDetails"
import { SetupInstructionDetails } from "./sections/SetupInstructionDetails"
import { TournamentDetails } from "./sections/TournamentDetails"
import { VendorDetails } from "./sections/VendorDetails"

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

  const showVendors =
    prefs.sections.vendors &&
    (vendors ?? []).some((tb) => selectedVendorIds.includes(tb.id))

  const showFood =
    prefs.sections.food &&
    (food ?? []).some((tb) => selectedFoodIds.includes(tb.id))

  const showBeverage =
    prefs.sections.beverage &&
    hasBeverageSectionContent({
      timeblocks: beverageTimeblocks.filter((tb) => selectedBeverageIds.includes(tb.id)),
      items: beverageItems,
    })

  const showSetup =
    prefs.sections.setup &&
    (setup ?? []).some((tb) => selectedSetupIds.includes(tb.id))

  const showNotes =
    prefs.sections.notes &&
    (notes ?? []).some((tb) => selectedNoteIds.includes(tb.id))

  return (
    <PreviewDocument
      continuationHeadings={{
        food: <SectionFrame title="Food (continued)"><span className="sr-only">continued</span></SectionFrame>,
        beverage: <SectionFrame title="Beverage (continued)"><span className="sr-only">continued</span></SectionFrame>,
      }}
    >
      <PreviewBlock id="beo-overview" keepTogether>
        <PrintHeader
          event={event}
          showContactInfo={prefs.showContactInfo}
          showInternalNotes={prefs.showInternalNotes}
        />
      </PreviewBlock>

      {showVendors ? (
        <PreviewBlock id="beo-vendors" keepTogether>
          <SectionFrame title="Vendor Details">
            <VendorDetails vendors={vendors} selectedIds={selectedVendorIds} />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

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

      {showFood ? (
        <PreviewBlock id="beo-food" breakBefore continuationKey="food">
          <SectionFrame title="Food">
            <FoodDetails
              timeblocks={food}
              selectedIds={selectedFoodIds}
              showPricing={prefs.showPricing}
            />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showBeverage ? (
        <PreviewBlock id="beo-beverage" breakBefore continuationKey="beverage">
          <SectionFrame title="Beverage">
            <BeverageDetails
              timeblocks={beverageTimeblocks}
              items={beverageItems}
              selectedTimeblockIds={selectedBeverageIds}
              showPricing={prefs.showPricing}
            />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showSetup ? (
        <PreviewBlock id="beo-setup" keepTogether>
          <SectionFrame title="Setup Instructions">
            <SetupInstructionDetails timeblocks={setup} selectedIds={selectedSetupIds} />
          </SectionFrame>
        </PreviewBlock>
      ) : null}

      {showNotes ? (
        <PreviewBlock id="beo-notes" keepTogether>
          <SectionFrame title="Notes">
            <NoteDetails timeblocks={notes} selectedIds={selectedNoteIds} />
          </SectionFrame>
        </PreviewBlock>
      ) : null}
    </PreviewDocument>
  )
}
