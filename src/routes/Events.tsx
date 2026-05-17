// routes/events.tsx
import { ErrorBoundary } from "react-error-boundary";
import CalendarWorkspace from "~/features/calendar/CalendarWorkspace";
import RouteBlockingError from "~/components/ui/route-blocking-error";

export default function EventsRoute() {
  return (
    <ErrorBoundary
      fallback={
        <RouteBlockingError
          title="Something went wrong"
          description="The Events page hit an unexpected issue. Please reload and try again."
          onRetry={() => window.location.reload()}
        />
      }
    >
      <CalendarWorkspace />
    </ErrorBoundary>
  );
}
