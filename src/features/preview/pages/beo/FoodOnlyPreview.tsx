import {
  SectionFrameHeading,
  SectionFrameItem,
} from "~/features/preview/components/SectionFrame"
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
import { FoodTimeblockDetails } from "./sections/FoodDetails"

export function FoodOnlyPreview() {
  const {
    data: event,
    isSuccess: eventReady,
    isError: eventError,
    isFetching: eventFetching,
  } = useEvent()
  const { state } = usePreviewPreferences()
  const prefs = state["beo-food"]
  const {
    data: food,
    isSuccess: foodReady,
    isError: foodError,
    isFetching: foodFetching,
  } = useFoodSection()

  const contacts = usePrintableContactGroups(event?.id)

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
      dataError={contacts.isError || eventError || foodError}
      dataReady={contacts.isSuccess && !contacts.isFetching && eventReady && !eventFetching && foodReady && !foodFetching && state.defaultsApplied.foodBeoTimeblocks}
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
        ? selectedFood.map((timeblock, index) => {
            const isFirst = index === 0
            const isLast = index === selectedFood.length - 1
            return (
              <PreviewBlock
                key={`food-beo-food-${timeblock.id}`}
                id={`food-beo-food-${timeblock.id}`}
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
    </PreviewDocument>
  )
}
