import EventTimeline from "~/features/preview/pages/timeline/EventTimeline"
import { PreviewBlock, PreviewDocument } from "~/features/preview/pagination/PreviewDocument"
import { usePreviewPreferences } from "~/features/preview/preferences/PreviewPreferencesContext"
import { useEvent } from "~/hooks/useEvent"
import { formatDate, getDateString } from "~/lib/formatters"

export default function TimelinePreview() {
  const { data: event } = useEvent()
  const { state } = usePreviewPreferences()
  const prefs = state.timeline
  const showInternalNotes =
    prefs.showInternalNotes && Boolean(event?.internalNotes?.trim())

  return (
    <PreviewDocument>
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
        </div>
      </PreviewBlock>

      <PreviewBlock id="timeline-body">
        <EventTimeline includeSystemRows={prefs.includeSystemRows} />
      </PreviewBlock>
    </PreviewDocument>
  )
}
