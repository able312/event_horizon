import { Body } from "~/components/layouts/SplitLayout"
import type { EventRequest } from "~/definitions/database"
import RequestDetailView from "~/features/event-requests/components/RequestDetailView"
import { useEventRequests } from "~/features/event-requests/hooks/useEventRequests"
import InboxBodyHeader from "./components/InboxBodyHeader"

type InboxBodyProps = {
  selectedRequestId: string | null
  reviewingRequestId: string | null
  onBack: () => void
  onReviewRequest: (request: EventRequest) => void
  /** Clear the selection and close any review form before dismissing. */
  onDismissRequest: (requestId: string) => void
}

/** Inbox content and actions; the host workspace owns navigation and the review form. */
const InboxBody: React.FC<InboxBodyProps> = ({
  selectedRequestId,
  reviewingRequestId,
  onBack,
  onReviewRequest,
  onDismissRequest,
}) => {
  const { requests, dismissRequest } = useEventRequests()
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null

  const handleDismiss = (requestId: string) => {
    onDismissRequest(requestId)
    dismissRequest(requestId)
  }

  return (
    <>
      <InboxBodyHeader
        onBack={onBack}
        requestActions={selectedRequest ? {
          isReviewing: reviewingRequestId === selectedRequest.id,
          onReview: () => onReviewRequest(selectedRequest),
          onDismiss: () => handleDismiss(selectedRequest.id),
        } : null}
      />
      <Body.Content>
        {selectedRequest ? (
          <RequestDetailView key={selectedRequest.id} request={selectedRequest} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Select a request to see what the client sent.</p>
          </div>
        )}
      </Body.Content>
    </>
  )
}

export default InboxBody
