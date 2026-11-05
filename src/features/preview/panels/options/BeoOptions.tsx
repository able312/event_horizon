import {
  PreviewOptionSection,
  PreviewTimeblockSelector,
  PreviewToggleRow,
} from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  hasBeverageSectionContent,
  hasInternalNotes,
  hasKitchenNotes,
  hasPricedFoodOrBeverage,
  toTimeblockOptions,
  type TimeblockOption,
} from "~/features/preview/preferences/selectors"
import {
  BEO_TIMEBLOCK_SECTION_IDS,
  type BeoPreferences,
  type BeoTimeblockSectionId,
} from "~/features/preview/preferences/types"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { usePrintableContactGroups } from "~/hooks/useEventContacts"
import { useFoodSection } from "~/hooks/useFoodSection"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"

const SECTION_LABELS: Record<keyof BeoPreferences["sections"], string> = {
  tournament: "Tournament details",
  cart: "Cart details",
  food: "Food",
  beverage: "Beverage",
  setup: "Setup instructions",
  notes: "Notes",
}

const TIMEBLOCK_SELECTOR_LABELS: Record<BeoTimeblockSectionId, string> = {
  food: "Food timeblocks",
  beverage: "Beverage timeblocks",
  setup: "Setup timeblocks",
  notes: "Note timeblocks",
}

/** Full BEO options: header toggles, which sections print, and which timeblocks each prints. */
export function BeoOptions() {
  const { state, dispatch } = usePreviewPreferences()
  const prefs = state.beo
  const { data: event } = useEvent()
  const { data: contactGroups } = usePrintableContactGroups(event?.id)
  const { data: food } = useFoodSection()
  const { timeblocks: beverageTimeblocks, items: beverageItems } = useBeverageSection()
  const { data: setup } = useSetupInstructionSection()
  const { data: notes } = useNoteSection()

  const timeblockOptions: Record<BeoTimeblockSectionId, TimeblockOption[]> = {
    food: toTimeblockOptions(food),
    beverage: toTimeblockOptions(beverageTimeblocks),
    setup: toTimeblockOptions(setup),
    notes: toTimeblockOptions(notes),
  }
  const selectedIdsFor = (section: BeoTimeblockSectionId) =>
    filterSelectedIds(
      prefs.selectedTimeblockIds[section],
      timeblockOptions[section].map((o) => o.id),
    )

  const foodSelected = selectedIdsFor("food")
  const kitchenNotesAvailable =
    prefs.sections.food && hasKitchenNotes((food ?? []).filter((tb) => foodSelected.includes(tb.id)))
  const isTournament = event?.type === "tournament"
  const sectionAvailable: Record<keyof BeoPreferences["sections"], boolean> = {
    tournament: isTournament,
    cart: isTournament,
    food: (food?.length ?? 0) > 0,
    beverage: hasBeverageSectionContent({ timeblocks: beverageTimeblocks, items: beverageItems }),
    setup: (setup?.length ?? 0) > 0,
    notes: (notes?.length ?? 0) > 0,
  }
  const sectionIds = Object.keys(SECTION_LABELS) as Array<keyof BeoPreferences["sections"]>

  return (
    <PreviewOptionSection title="Options">
      {(contactGroups?.length ?? 0) > 0 ? (
        <PreviewToggleRow
          id="beo-contact"
          label="Contact information"
          checked={prefs.showContactInfo}
          onChange={(value) => dispatch({ type: "beo/setShowContactInfo", value })}
        />
      ) : null}
      {hasInternalNotes(event) ? (
        <PreviewToggleRow
          id="beo-internal-notes"
          label="Internal notes"
          checked={prefs.showInternalNotes}
          onChange={(value) => dispatch({ type: "beo/setShowInternalNotes", value })}
        />
      ) : null}
      {kitchenNotesAvailable ? (
        <PreviewToggleRow
          id="beo-kitchen-notes"
          label="Kitchen notes"
          checked={prefs.showKitchenNotes}
          onChange={(value) => dispatch({ type: "beo/setShowKitchenNotes", value })}
        />
      ) : null}
      {hasPricedFoodOrBeverage({ foodTimeblocks: food, beverageItems }) ? (
        <PreviewToggleRow
          id="beo-pricing"
          label="Show pricing"
          checked={prefs.showPricing}
          onChange={(value) => dispatch({ type: "beo/setShowPricing", value })}
        />
      ) : null}

      {sectionIds
        .filter((section) => sectionAvailable[section])
        .map((section) => (
          <PreviewToggleRow
            key={section}
            id={`beo-section-${section}`}
            label={SECTION_LABELS[section]}
            checked={prefs.sections[section]}
            onChange={(value) => dispatch({ type: "beo/setSectionVisible", section, value })}
          />
        ))}

      {BEO_TIMEBLOCK_SECTION_IDS.filter((section) => prefs.sections[section]).map((section) => (
        <PreviewTimeblockSelector
          key={section}
          sectionLabel={TIMEBLOCK_SELECTOR_LABELS[section]}
          options={timeblockOptions[section]}
          selectedIds={selectedIdsFor(section)}
          onToggle={(id, value) =>
            dispatch({ type: "beo/setTimeblockSelected", section, id, value })
          }
          onSelectAll={() =>
            dispatch({
              type: "beo/selectAllTimeblocks",
              section,
              ids: timeblockOptions[section].map((o) => o.id),
            })
          }
          onClearAll={() => dispatch({ type: "beo/clearAllTimeblocks", section })}
        />
      ))}
    </PreviewOptionSection>
  )
}
