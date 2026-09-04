import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { isSystemTimelineRow } from "~/features/preview/preferences/selectors"
import { useEvent } from "~/hooks/useEvent"
import { useTimeline } from "~/hooks/useTimeline"
import { formatDate, getDateString } from "~/lib/formatters"
import TimelineBlock from "./timeline/TimelineBlock"
import { sortTimelineTimeblocks } from "./timeline/sortTimelineTimeblocks"

export default function TimelinePreview() {
  const { data: event } = useEvent()
  const { state } = usePreviewPreferences()
  const prefs = state.timeline
  const showInternalNotes =
    prefs.showInternalNotes && Boolean(event?.internalNotes?.trim())

  const { data: allTimeblocks, isLoading } = useTimeline()

  const sortedTimeblocks = sortTimelineTimeblocks(allTimeblocks ?? []).filter((timeblock) =>
    prefs.includeSystemRows ? true : !isSystemTimelineRow(timeblock),
  )

  const hasTimedRows = sortedTimeblocks.some(
    (tb) => typeof tb.time === "string" && tb.time.trim().length > 0,
  )

  return (
    <PreviewDocument
      continuationHeadings={{
        timeline: (
          <h4 className="mb-3 text-sm font-medium text-stone-600">Event Timeline (continued)</h4>
        ),
      }}
    >
      <PreviewBlock id="timeline-header" keepTogether>
        <div>
          <h2 className="pb-2 text-xl font-bold">{event?.title}</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 border-b-2">
            <div>
              <p className="text-sm">
                {getDateString(event?.startDateTime ?? "", event?.endDateTime ?? "")}
              </p>
              <p className="text-sm">
                {event?.guestCountFinal
                  ? event.maxGuests
                  : `${event?.minGuests} - ${event?.maxGuests}`}{" "}
                Guests
              </p>
            </div>

            <div>
              <p className="text-right text-sm">{event?.type.toLocaleUpperCase()}</p>
              <p className="text-right text-sm text-stone-600">
                Generated {formatDate(new Date().toString())}
              </p>
            </div>

            {showInternalNotes ? (
              <pre className="col-span-2 my-4 text-sm italic">{event?.internalNotes}</pre>
            ) : null}
          </div>

          <h4 className="mb-3 text-sm font-medium">Event Timeline</h4>
        </div>
      </PreviewBlock>

      {isLoading ? (
        <PreviewBlock id="timeline-loading" keepTogether>
          <div className="w-full">Loading...</div>
        </PreviewBlock>
      ) : !hasTimedRows ? (
        <PreviewBlock id="timeline-empty" keepTogether>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Add timeblocks with times to see them in the timeline.
            </p>
          </div>
        </PreviewBlock>
      ) : (
        sortedTimeblocks.map((timeblock) => {
          if (!timeblock.time || timeblock.time.trim().length === 0) return null
          return (
            <PreviewBlock
              key={`timeline-row-${timeblock.id}`}
              id={`timeline-row-${timeblock.id}`}
              continuationKey="timeline"
            >
              <TimelineBlock timeblock={timeblock} />
            </PreviewBlock>
          )
        })
      )}
    </PreviewDocument>
  )
}
