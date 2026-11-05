import westlinksLogo from "~/assets/Westlinks-SM-RGB.png"
import siloLogo from "~/assets/SILO-SM-RGB.png"
import type { PrimaryClient } from "~/definitions/contacts"
import type { FinancialDocumentKindLabels } from "~/features/preview/lib/financialDocumentKinds"
import { formatDate } from "~/lib/formatters"

/** Top of the estimate/invoice: title, venue, logos, then the client and the dates. */
export function FinancialHeader({
  labels,
  client,
  eventStartDateTime,
}: {
  labels: FinancialDocumentKindLabels
  client: PrimaryClient | null | undefined
  eventStartDateTime: string | null | undefined
}) {
  return (
    <div>
      <div className="flex items-center justify-between pb-6">
        <div>
          <h2 className="text-xl font-bold">{labels.title}</h2>
          <p className="text-sm font-medium">The Club at Westlinks</p>
          <p className="text-xs italic">2089 Bruce Rd 17, Port Elgin, ON</p>
        </div>
        <div className="flex gap-4">
          <img className="h-25 w-25" src={westlinksLogo} alt="Westlinks" />
          <img className="h-25 w-25" src={siloLogo} alt="SILO" />
        </div>
      </div>

      <div className="mb-4 flex justify-between border-b-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
          {client?.displayName ? (
            <>
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">{client.displayName}</dd>
            </>
          ) : null}
          {client?.phone ? (
            <>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{client.phone}</dd>
            </>
          ) : null}
          {client?.email ? (
            <>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{client.email}</dd>
            </>
          ) : null}
        </dl>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2 text-sm">
          <dt className="text-muted-foreground">Event Date</dt>
          <dd className="font-medium">{formatDate(eventStartDateTime ?? "")}</dd>
          <dt className="text-muted-foreground">{labels.dateLabel}</dt>
          <dd className="font-medium">{formatDate(new Date().toString())}</dd>
        </dl>
      </div>
    </div>
  )
}
