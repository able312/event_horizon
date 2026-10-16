import { Search } from "lucide-react"
import { useState, type ReactNode } from "react"

import type { EventRequest } from "~/definitions/database"
import { InboxRequestCard } from "~/features/calendar/components/InboxRequestCard"
import { filterInboxRequests } from "~/features/calendar/lib/inboxList"
import { InlineQueryError } from "~/features/contacts/components/InlineQueryError"

type QueryStatus = { isLoading: boolean; isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> }

type InboxPanelProps = {
  requests: EventRequest[]
  requestsQuery: QueryStatus
  selectedRequestId: string | null
  onSelectRequest: (request: EventRequest) => void
}

type InboxSectionProps = {
  id: string
  title: string
  count: number
  children: ReactNode
}

const InboxSection: React.FC<InboxSectionProps> = ({ id, title, count, children }) => (
  <section aria-labelledby={id} className="pb-2">
    <h2 id={id} className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
      {title}
      {count > 0 ? ` (${count})` : ""}
    </h2>
    {children}
  </section>
)

const EmptyNote: React.FC<{ children: ReactNode }> = ({ children }) => (
  <p className="px-3 py-3 text-xs text-stone-500">{children}</p>
)

/** The Inbox sidebar: website requests waiting for review, with a search. */
const InboxPanel: React.FC<InboxPanelProps> = ({
  requests,
  requestsQuery,
  selectedRequestId,
  onSelectRequest,
}) => {
  const [query, setQuery] = useState("")
  const shownRequests = filterInboxRequests(requests, query)

  return (
    <>
      <div className="p-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search inbox…"
            aria-label="Search inbox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pr-4 pl-10 text-sm text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"
          />
        </div>
      </div>

      <InboxSection id="inbox-requests-heading" title="Requests" count={requests.length}>
        {/* A failed load would otherwise read as "no new requests" */}
        {requestsQuery.isError ? (
          <InlineQueryError
            message="Could not load website requests."
            onRetry={() => void requestsQuery.refetch()}
            isRetrying={requestsQuery.isFetching}
            className="mx-3 my-1"
          />
        ) : requestsQuery.isLoading ? null : shownRequests.length === 0 ? (
          <EmptyNote>{query.trim() ? "No matches." : "No new requests from the website."}</EmptyNote>
        ) : (
          <ul className="divide-y divide-white/10">
            {shownRequests.map((request) => (
              <InboxRequestCard
                key={request.id}
                request={request}
                selected={request.id === selectedRequestId}
                onSelect={onSelectRequest}
              />
            ))}
          </ul>
        )}
      </InboxSection>
    </>
  )
}

export default InboxPanel
