import { useTimeline } from "~/hooks/useTimeline"
import TimelineBlock from "./TimelineBlock"
import { sortTimelineTimeblocks } from "./sortTimelineTimeblocks"

const EventTimeline = () => {
  const { data: allTimeblocks, isLoading } = useTimeline()

  if (isLoading) {
    return <div className="w-full">Loading...</div>
  }

  if (!allTimeblocks) return null

  const sortedTimeblocks = sortTimelineTimeblocks(allTimeblocks)

  if (sortedTimeblocks.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <p className="text-muted-foreground text-sm">
          Add timeblocks with times to see them in the timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 print:bg-white">
      <h4 className="font-medium text-sm mb-3">Event Timeline</h4>
      <div className="print:bg-white">
        {sortedTimeblocks.map((timeblock) => (
          <TimelineBlock key={timeblock.id} timeblock={timeblock} />
        ))}
      </div>
    </div>
  )
}

export default EventTimeline
