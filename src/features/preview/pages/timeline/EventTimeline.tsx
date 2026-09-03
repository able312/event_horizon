import { useTimeline } from "~/hooks/useTimeline"
import { isSystemTimelineRow } from "~/features/preview/preferences/selectors"
import TimelineBlock from "./TimelineBlock"
import { sortTimelineTimeblocks } from "./sortTimelineTimeblocks"

type EventTimelineProps = {
  includeSystemRows?: boolean
}

const EventTimeline = ({ includeSystemRows = true }: EventTimelineProps) => {
  const { data: allTimeblocks, isLoading } = useTimeline()

  if (isLoading) {
    return <div className="w-full">Loading...</div>
  }

  if (!allTimeblocks) return null

  const sortedTimeblocks = sortTimelineTimeblocks(allTimeblocks).filter((timeblock) =>
    includeSystemRows ? true : !isSystemTimelineRow(timeblock),
  )

  if (sortedTimeblocks.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          Add timeblocks with times to see them in the timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 print:bg-white">
      <h4 className="mb-3 text-sm font-medium">Event Timeline</h4>
      <div className="print:bg-white">
        {sortedTimeblocks.map((timeblock) => (
          <TimelineBlock key={timeblock.id} timeblock={timeblock} />
        ))}
      </div>
    </div>
  )
}

export default EventTimeline
