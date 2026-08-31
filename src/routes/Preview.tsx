import { ErrorBoundary } from "react-error-boundary"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import PreviewWorkspace from "~/features/preview/PreviewWorkspace"

export default function PreviewRoute() {
  return (
    <ErrorBoundary
      fallback={
        <RouteBlockingError
          title="Something went wrong"
          description="The Preview page hit an unexpected issue. Please reload and try again."
          onRetry={() => window.location.reload()}
        />
      }
    >
      <PreviewWorkspace />
    </ErrorBoundary>
  )
}
