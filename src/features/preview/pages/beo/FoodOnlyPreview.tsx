import { PrintHeader } from "./EventOverviewHeader"
import { SectionFrame } from "~/features/preview/components/SectionFrame"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { filterSelectedIds } from "~/features/preview/preferences/selectors"
import { useEvent } from "~/hooks/useEvent"
import { useFoodSection } from "~/hooks/useFoodSection"
import { FoodDetails } from "./sections/FoodDetails"

export function FoodOnlyPreview() {
  const { data: event } = useEvent()
  const { state } = usePreviewPreferences()
  const prefs = state["beo-food"]
  const { data: food } = useFoodSection()

  if (!event) return <p>No event data found.</p>

  const availableFoodIds = (food ?? []).map((tb) => tb.id)
  const selectedFoodIds = state.defaultsApplied.foodBeoTimeblocks
    ? filterSelectedIds(prefs.selectedFoodTimeblockIds, availableFoodIds)
    : availableFoodIds

  const showFood = (food ?? []).some((tb) => selectedFoodIds.includes(tb.id))

  return (
    <PreviewDocument
      continuationHeadings={{
        food: (
          <SectionFrame title="Food (continued)">
            <span className="sr-only">continued</span>
          </SectionFrame>
        ),
      }}
    >
      <PreviewBlock id="food-beo-overview" keepTogether>
        <PrintHeader
          event={event}
          showContactInfo={prefs.showContactInfo}
          showInternalNotes={prefs.showInternalNotes}
        />
      </PreviewBlock>

      {showFood ? (
        <PreviewBlock id="food-beo-food" continuationKey="food">
          <SectionFrame title="Food">
            <FoodDetails
              timeblocks={food}
              selectedIds={selectedFoodIds}
              showPricing={prefs.showPricing}
            />
          </SectionFrame>
        </PreviewBlock>
      ) : null}
    </PreviewDocument>
  )
}
