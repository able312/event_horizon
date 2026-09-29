import { ErrorBoundary } from "react-error-boundary"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import ContactsDirectoryWorkspace from "~/features/contacts-directory/ContactsDirectoryWorkspace"

export default function ContactsRoute() {
  return (
    <ErrorBoundary
      fallback={
        <RouteBlockingError
          title="Something went wrong"
          description="The Contacts page hit an unexpected issue. Please reload and try again."
          onRetry={() => window.location.reload()}
        />
      }
    >
      <ContactsDirectoryWorkspace />
    </ErrorBoundary>
  )
}
