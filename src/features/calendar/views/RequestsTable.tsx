import React from "react"
import type { EventRequest } from "~/definitions/database"
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import { formatDate } from "~/lib/formatters"
import { formatRequestDate, formatRequestTime, requestClientName } from "~/features/calendar/lib/eventRequestPrefill"

interface RequestsTableProps {
  /** Pending website requests, newest first */
  requests: EventRequest[]
  isLoading?: boolean
  onReview: (request: EventRequest) => void
  onDismiss: (requestId: string) => void
}

const headerCellClasses = "text-left px-4 py-3 font-medium text-muted-foreground"

/** Website event requests waiting in the Inbox. Review opens the pre-filled create form. */
const RequestsTable: React.FC<RequestsTableProps> = ({ requests, isLoading = false, onReview, onDismiss }) => (
  <table className="w-full">
    <thead className="bg-stone-50/20 rounded-lg border-b">
      <tr>
        <th className={headerCellClasses}>Received</th>
        <th className={headerCellClasses}>Client</th>
        <th className={headerCellClasses}>Type</th>
        <th className={headerCellClasses}>Preferred date</th>
        <th className={headerCellClasses}>Guests</th>
        <th className={headerCellClasses}>Details</th>
        <th className="px-4 py-3"></th>
      </tr>
    </thead>
    <tbody>
      {requests.length === 0 ? (
        <tr>
          {isLoading ? (
            <td colSpan={7} className="px-4 py-8" />
          ) : (
            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
              No new requests from the website.
            </td>
          )}
        </tr>
      ) : (
        requests.map((request) => (
          <RequestRow key={request.id} request={request} onReview={onReview} onDismiss={onDismiss} />
        ))
      )}
    </tbody>
  </table>
)

interface RequestRowProps {
  request: EventRequest
  onReview: (request: EventRequest) => void
  onDismiss: (requestId: string) => void
}

const RequestRow: React.FC<RequestRowProps> = ({ request, onReview, onDismiss }) => {
  const name = requestClientName(request)
  return (
    <tr className="border-b hover:bg-stone-50 align-top">
      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(request.submittedAt)}</td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium">{name}</div>
        {request.organizationName ? <div className="text-muted-foreground">{request.organizationName}</div> : null}
        <div className="text-muted-foreground">{request.email}</div>
        <div className="text-muted-foreground">{request.phone}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-sm ${EVENT_TYPE_COLORS[request.eventType]}`}>
          {EVENT_TYPE_LABELS[request.eventType]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        {request.preferredDate ? formatRequestDate(request.preferredDate) : "-"}
        {request.startTime ? <div className="text-muted-foreground">{formatRequestTime(request.startTime)}</div> : null}
      </td>
      <td className="px-4 py-3 text-sm">{request.guestCount}</td>
      <td className="px-4 py-3 text-sm max-w-md">
        <p className="line-clamp-3 whitespace-pre-line" title={request.details ?? undefined}>
          {request.details ?? "-"}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onReview(request)}
            aria-label={`Review request from ${name}`}
            className="rounded-md bg-orange-500 px-3 py-1 text-sm font-medium text-stone-950 transition-colors hover:bg-orange-400"
          >
            Review
          </button>
          <button
            type="button"
            onClick={() => onDismiss(request.id)}
            aria-label={`Dismiss request from ${name}`}
            className="rounded-md border px-3 py-1 text-sm transition-colors hover:bg-stone-100"
          >
            Dismiss
          </button>
        </div>
      </td>
    </tr>
  )
}

export default RequestsTable
