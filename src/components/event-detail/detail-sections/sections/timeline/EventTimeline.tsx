import { useTimeline } from "~/hooks/useTimeline"
import TimelineBlock from "./TimelineBlock"


const EventTimeline = () => {
  
  const { 
    data: allTimeblocks,
    isLoading,
    updateTimeblock,
  } = useTimeline()

  

  if (isLoading) {
    return <div className="w-full">Loading...</div>
  }

  if (!allTimeblocks) return null

  const renderableTimeblocks = allTimeblocks.filter(
    (timeblock) => typeof timeblock.time === "string" && timeblock.time.trim().length > 0,
  )

  const sortedTimeblocks = [...renderableTimeblocks].sort((a, b) => {
    const timeCompare = a.time!.localeCompare(b.time!)
    if (timeCompare !== 0) return timeCompare

    const titleCompare = a.title.localeCompare(b.title)
    if (titleCompare !== 0) return titleCompare

    return a.id.localeCompare(b.id)
  })

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
      <h4 className="font-medium text-sm mb-3 break-after-avoid">Event Timeline</h4>
      <div className="print:bg-white">
        {sortedTimeblocks.map((timeblock) => (
          <TimelineBlock
            key={timeblock.id}
            timeblock={timeblock}
            updateTimeblock={updateTimeblock}
          />
        ))}
      </div>
    </div>
  )
}

export default EventTimeline
