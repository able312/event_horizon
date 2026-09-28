import type { Event } from "~/definitions/database"
import { formatDate, getDateString } from "~/lib/formatters"
import { SectionFrame } from "~/features/preview/components/SectionFrame"
import { hasContactInfo } from "~/features/preview/preferences/selectors"
import { usePrimaryClient } from "~/hooks/useEventContacts"

type PrintHeaderProps = {
  event: Event
  showContactInfo?: boolean
  showInternalNotes?: boolean
}

export function PrintHeader({
  event,
  showContactInfo = true,
  showInternalNotes = true,
}: PrintHeaderProps) {
  const { data: client } = usePrimaryClient(event?.id)

  if (!event) return null

  const contactVisible = showContactInfo && hasContactInfo(client)
  const notesVisible = showInternalNotes && Boolean(event.internalNotes?.trim())

  return (
    <>
      <SectionFrame title="Event Overview">
        <div>
          <h3 className="pb-1 font-bold">{event.title}</h3>
          <p className="text-sm">
            {getDateString(event?.startDateTime ?? "", event?.endDateTime ?? "")}
          </p>
          <dl className="flex justify-between py-1">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-2 text-sm">
              <dt className="text-muted-foreground">Event Type</dt>
              <dd className="font-medium">{event.type.toLocaleUpperCase()}</dd>

              <dt className="text-muted-foreground">Guest Count</dt>
              <dd className="font-medium">
                {event.minGuests} – {event.maxGuests}{" "}
                {event.guestCountFinal ? "(final)" : "(est.)"}
              </dd>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-2 text-sm">
              <dt className="text-muted-foreground">Event Status</dt>
              <dd className="font-medium">
                {event.status.replace("_", " ").toLocaleUpperCase()}
              </dd>

              <dt className="text-muted-foreground">Generated</dt>
              <dd className="font-medium">{formatDate(new Date().toString())}</dd>
            </div>
          </dl>
          {notesVisible ? (
            <div className="mt-3 border-t pt-3 text-sm">
              <p className="mb-1 text-muted-foreground">Notes</p>
              <pre className="whitespace-pre-wrap font-sans">{event.internalNotes}</pre>
            </div>
          ) : null}
        </div>
      </SectionFrame>

      {contactVisible ? (
        <SectionFrame title="Contact Information">
          <dl className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-x-4 gap-y-1 text-sm">
            {client?.displayName.trim() ? (
              <>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{client.displayName}</dd>
              </>
            ) : null}
            {client?.phone?.trim() ? (
              <>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{client.phone}</dd>
              </>
            ) : null}
            {client?.email?.trim() ? (
              <>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{client.email}</dd>
              </>
            ) : null}
          </dl>
        </SectionFrame>
      ) : null}
    </>
  )
}
