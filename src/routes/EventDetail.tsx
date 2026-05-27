import { ErrorBoundary } from "react-error-boundary"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import EventDetailWorkspace from "~/features/event-detail/EventDetailWorkspace"

export default function EventDetailRoute() {
  return (
    <ErrorBoundary
      fallback={
        <RouteBlockingError
          title="Something went wrong"
          description="The Event Detail page hit an unexpected issue. Please reload and try again."
          onRetry={() => window.location.reload()}
        />
      }
    >
      <EventDetailWorkspace />
    </ErrorBoundary>
  )
}
