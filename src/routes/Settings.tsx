import { ErrorBoundary } from "react-error-boundary"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import SettingsWorkspace from "~/features/settings/SettingsWorkspace"

export default function SettingsRoute() {
  return (
    <ErrorBoundary
      fallback={
        <RouteBlockingError
          title="Something went wrong"
          description="The Settings page hit an unexpected issue. Please reload and try again."
          onRetry={() => window.location.reload()}
        />
      }
    >
      <SettingsWorkspace />
    </ErrorBoundary>
  )
}
