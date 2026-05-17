import { formatDate, getDateString } from "~/lib/formatters"
import { SectionBox } from "./SectionBox"
import type { Event } from "~/definitions/database"

export function PrintHeader({event}: {event: Event}) {

  if (!event) return null

  return (
    <>
        <SectionBox title="Event Overview">
          <div>
            <h3 className="pb-1 font-bold">{event.title}</h3>
            <p className="text-sm">{getDateString(event?.startDateTime ?? "", event?.endDateTime ?? "")}</p>
            <dl className="flex justify-between py-1">
              
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pt-2">
                <dt className="text-muted-foreground">Event Type</dt>
                <dd className="font-medium">{event.type.toLocaleUpperCase()}</dd>

                <dt className="text-muted-foreground">Guest Count</dt>
                <dd className="font-medium">{event.minGuests} – {event.maxGuests} {event.guestCountFinal ? "(final)" : "(est.)"}</dd>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pt-2">
                <dt className="text-muted-foreground">Event Status</dt>
                <dd className="font-medium">{event.status.replace("_", " ").toLocaleUpperCase()}</dd>

                <dt className="text-muted-foreground">Genereated</dt>
                <dd className="font-medium">{formatDate((new Date).toString())}</dd>
              </div>
              
            </dl>
              {event?.internalNotes && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <pre className="font-sans whitespace-pre-wrap">{event.internalNotes}</pre>
                </div>
              )}
          </div>
        </SectionBox>

        {event.clientName && <SectionBox title="Contact Information">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{event.clientName}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{event.clientPhone}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{event.clientEmail}</dd>
            </dl>
        </SectionBox>}
    </>
  )
}