import { SectionFrameHeading } from "~/features/preview/components/SectionFrame"
import { combineQueryStates } from "~/features/preview/pagination/combineQueryStates"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import {
  filterSelectedIds,
  sortTimeblocksByTime,
} from "~/features/preview/preferences/selectors"
import { usePrintableContactGroups } from "~/hooks/useEventContacts"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { PrintHeader } from "./EventOverviewHeader"
import { renderSectionBlocks } from "./renderSectionBlocks"
import { FoodTimeblockDetails } from "./sections/FoodDetails"

export function FoodOnlyPreview() {
  const eventQuery = useEvent()
  const event = eventQuery.data
  const { state } = usePreviewPreferences()
  const prefs = state["beo-food"]
  const foodQuery = useFoodSection()
  const food = foodQuery.data

  const contacts = usePrintableContactGroups(event?.id)
  const queries = combineQueryStates([contacts, eventQuery, foodQuery])

  if (!event) return <p>No event data found.</p>

  const availableFoodIds = (food ?? []).map((tb) => tb.id)
  const selectedFoodIds = state.defaultsApplied.foodBeoTimeblocks
    ? filterSelectedIds(prefs.selectedFoodTimeblockIds, availableFoodIds)
    : availableFoodIds

  const selectedFood = sortTimeblocksByTime(food).filter((tb) =>
    selectedFoodIds.includes(tb.id),
  )
  const showFood = selectedFood.length > 0

  return (
    <PreviewDocument
      dataError={queries.error}
      dataReady={queries.ready && state.defaultsApplied.foodBeoTimeblocks}
      continuationHeadings={{
        food: <SectionFrameHeading title="Food (continued)" />,
      }}
    >
      <PreviewBlock id="food-beo-overview" keepTogether>
        <PrintHeader
          event={event}
          contactGroups={contacts.data}
          showContactInfo={prefs.showContactInfo}
          showInternalNotes={prefs.showInternalNotes}
        />
      </PreviewBlock>

      {showFood
        ? renderSectionBlocks({
            key: "food",
            title: "Food",
            items: selectedFood,
            blockId: (timeblock) => `food-beo-food-${timeblock.id}`,
            render: (timeblock) => (
              <FoodTimeblockDetails
                timeblock={timeblock}
                showPricing={prefs.showPricing}
                showKitchenNotes={prefs.showKitchenNotes}
              />
            ),
          })
        : null}
    </PreviewDocument>
  )
}
