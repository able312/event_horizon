import {
  PreviewOptionSection,
  PreviewTimeblockSelector,
  PreviewToggleRow,
} from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  hasInternalNotes,
  hasKitchenNotes,
  hasPricedFoodOrBeverage,
  toTimeblockOptions,
} from "~/features/preview/preferences/selectors"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { useEvent } from "~/hooks/useEvent"
import { usePrintableContactGroups } from "~/hooks/useEventContacts"
import { useFoodSection } from "~/hooks/useFoodSection"

/** Food BEO options: header toggles and which food timeblocks print. */
export function FoodBeoOptions() {
  const { state, dispatch } = usePreviewPreferences()
  const prefs = state["beo-food"]
  const { data: event } = useEvent()
  const { data: contactGroups } = usePrintableContactGroups(event?.id)
  const { data: food } = useFoodSection()
  const { items: beverageItems } = useBeverageSection()

  const foodOptions = toTimeblockOptions(food)
  const selected = filterSelectedIds(
    prefs.selectedFoodTimeblockIds,
    foodOptions.map((o) => o.id),
  )
  const kitchenNotesAvailable = hasKitchenNotes((food ?? []).filter((tb) => selected.includes(tb.id)))

  return (
    <PreviewOptionSection title="Options">
      {(contactGroups?.length ?? 0) > 0 ? (
        <PreviewToggleRow
          id="food-beo-contact"
          label="Contact information"
          checked={prefs.showContactInfo}
          onChange={(value) => dispatch({ type: "beo-food/setShowContactInfo", value })}
        />
      ) : null}
      {hasInternalNotes(event) ? (
        <PreviewToggleRow
          id="food-beo-internal-notes"
          label="Internal notes"
          checked={prefs.showInternalNotes}
          onChange={(value) => dispatch({ type: "beo-food/setShowInternalNotes", value })}
        />
      ) : null}
      {kitchenNotesAvailable ? (
        <PreviewToggleRow
          id="food-beo-kitchen-notes"
          label="Kitchen notes"
          checked={prefs.showKitchenNotes}
          onChange={(value) => dispatch({ type: "beo-food/setShowKitchenNotes", value })}
        />
      ) : null}
      {hasPricedFoodOrBeverage({ foodTimeblocks: food, beverageItems }) ? (
        <PreviewToggleRow
          id="food-beo-pricing"
          label="Show pricing"
          checked={prefs.showPricing}
          onChange={(value) => dispatch({ type: "beo-food/setShowPricing", value })}
        />
      ) : null}
      <PreviewTimeblockSelector
        sectionLabel="Food timeblocks"
        options={foodOptions}
        selectedIds={selected}
        onToggle={(id, value) => dispatch({ type: "beo-food/setTimeblockSelected", id, value })}
        onSelectAll={() =>
          dispatch({ type: "beo-food/selectAllTimeblocks", ids: foodOptions.map((o) => o.id) })
        }
        onClearAll={() => dispatch({ type: "beo-food/clearAllTimeblocks" })}
      />
    </PreviewOptionSection>
  )
}
