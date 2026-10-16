import React from "react"
import type { EventRequest } from "~/definitions/database"
import { InlineQueryError } from "~/features/contacts/components/InlineQueryError"
import RequestsTable from "./RequestsTable"

interface InboxViewProps {
  requests: EventRequest[]
  requestsQuery: { isLoading: boolean; isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> }
  onReviewRequest: (request: EventRequest) => void
  onDismissRequest: (requestId: string) => void
  /** The New leads table: the next step once a request is accepted */
  children: React.ReactNode
}

const sectionHeadingClasses = "px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"

/** Website requests waiting for review on top, New Lead events below. */
const InboxView: React.FC<InboxViewProps> = ({ requests, requestsQuery, onReviewRequest, onDismissRequest, children }) => (
  <>
    <section aria-labelledby="inbox-requests-heading">
      <h2 id="inbox-requests-heading" className={sectionHeadingClasses}>
        Requests{requests.length > 0 ? ` (${requests.length})` : ""}
      </h2>
      {/* A failed load would otherwise read as "no new requests" */}
      {requestsQuery.isError ? (
        <InlineQueryError
          message="Could not load website requests."
          onRetry={() => void requestsQuery.refetch()}
          isRetrying={requestsQuery.isFetching}
          className="mx-4 my-2 shrink-0"
        />
      ) : (
        <RequestsTable
          requests={requests}
          isLoading={requestsQuery.isLoading}
          onReview={onReviewRequest}
          onDismiss={onDismissRequest}
        />
      )}
    </section>
    <section aria-labelledby="inbox-leads-heading" className="mt-4">
      <h2 id="inbox-leads-heading" className={sectionHeadingClasses}>New leads</h2>
      {children}
    </section>
  </>
)

export default InboxView
