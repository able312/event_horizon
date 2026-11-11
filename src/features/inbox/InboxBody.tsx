import { useEffect } from "react"

import { Body } from "~/components/layouts/SplitLayout"
import type { EventRequest } from "~/definitions/database"
import EventNotificationDetailView from "~/features/event-notifications/components/EventNotificationDetailView"
import { useEventNotifications } from "~/features/event-notifications/hooks/useEventNotifications"
import RequestDetailView from "~/features/event-requests/components/RequestDetailView"
import { useEventRequests } from "~/features/event-requests/hooks/useEventRequests"
import InboxBodyHeader from "./components/InboxBodyHeader"

type InboxBodyProps = {
  selectedRequestId: string | null
  selectedNotificationId: string | null
  reviewingRequestId: string | null
  onBack: () => void
  onReviewRequest: (request: EventRequest) => void
  /** Clear the selection and close any review form before dismissing. */
  onDismissRequest: (requestId: string) => void
  /** Clear the selection before dismissing. */
  onDismissNotification: (notificationId: string) => void
  onOpenEvent: (eventId: string) => void
}

/** Inbox content and actions; the host workspace owns navigation and the review form. */
const InboxBody: React.FC<InboxBodyProps> = ({
  selectedRequestId,
  selectedNotificationId,
  reviewingRequestId,
  onBack,
  onReviewRequest,
  onDismissRequest,
  onDismissNotification,
  onOpenEvent,
}) => {
  const { requests, dismissRequest } = useEventRequests()
  const { notifications, markRead, dismiss: dismissNotification } = useEventNotifications()
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null
  const selectedNotification = notifications.find((notification) => notification.id === selectedNotificationId) ?? null

  // Opening an update reads it, as does a teammate's further change arriving while it's open
  const unreadSelectedId = selectedNotification && !selectedNotification.read ? selectedNotification.id : null
  useEffect(() => {
    if (unreadSelectedId) markRead(unreadSelectedId)
  }, [markRead, unreadSelectedId])

  const handleDismiss = (requestId: string) => {
    onDismissRequest(requestId)
    dismissRequest(requestId)
  }

  const handleDismissNotification = (notificationId: string) => {
    onDismissNotification(notificationId)
    dismissNotification(notificationId)
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
        notificationActions={selectedNotification ? {
          onOpenEvent: selectedNotification.eventExists ? () => onOpenEvent(selectedNotification.eventId) : null,
          onDismiss: () => handleDismissNotification(selectedNotification.id),
        } : null}
      />
      <Body.Content>
        {selectedRequest ? (
          <RequestDetailView key={selectedRequest.id} request={selectedRequest} />
        ) : selectedNotification ? (
          <EventNotificationDetailView key={selectedNotification.id} notification={selectedNotification} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Select a request or an update to see the details.</p>
          </div>
        )}
      </Body.Content>
    </>
  )
}

export default InboxBody
