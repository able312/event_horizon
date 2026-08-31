import { RefreshCw } from "lucide-react"
import EventTimeline from "~/components/event-detail/detail-sections/sections/timeline/EventTimeline" // adjust path to your actual Timeline component
import { useEvent } from "~/hooks/useEvent"
import { formatDate, getDateString } from "~/lib/formatters"

export default function TimelinePreview() {
    const { data: event } = useEvent()


  return (
    <>
      <h2 className="text-xl font-bold pb-2">{event?.title}</h2>
      <div className="border-b-2 mb-4 grid grid-cols-2 gap 2">
        <div>
            <p className="text-sm">{getDateString(event?.startDateTime ?? "", event?.endDateTime ?? "")}</p>
            <p className="text-sm">{event?.guestCountFinal ? event.maxGuests : event?.minGuests + " - " + event?.maxGuests} Guests</p>
        </div>

        <div>
            <p className="text-sm text-right">{event?.type.toLocaleUpperCase()}</p>
            <div className="flex justify-end items-center gap-2">
                <RefreshCw className="h-3 w-3"/>
                <p className="text-sm text-right">{formatDate((new Date).toString())}</p>
            </div>
        </div>

      <pre className="text-sm italic my-4">{event?.internalNotes}</pre>
      </div>


      <EventTimeline />
    </>
  )
}