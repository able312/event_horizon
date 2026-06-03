import { PrintHeader } from "./EventOverviewHeader"
import { useEvent } from "~/hooks/useEvent"
import { SectionBox } from "./SectionBox"
import { FoodDetails } from "./sections/FoodDetails"

export function FoodOnlyPreview() {
  const { data: event } = useEvent()

  if (!event) return <p>No event data found.</p>

  return (
    <div className="grid gap-4 h-content">
      <PrintHeader event={event} showContactInfo={false} />

      <SectionBox title="Food">
        <FoodDetails />
      </SectionBox>
    </div>
  )
}
