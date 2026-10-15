import { InlineQueryError } from "./InlineQueryError"

type ContactSearchStatusProps = {
  isLoading: boolean
  isError: boolean
  hasResults: boolean
  onRetry: () => void
  /** Shown when the search finished with no results; null shows nothing (e.g. a "create" option follows). */
  emptyMessage: string | null
}

/** The error, loading or empty state of a contact search, or nothing once there are results to show. */
export const ContactSearchStatus: React.FC<ContactSearchStatusProps> = ({
  isLoading,
  isError,
  hasResults,
  onRetry,
  emptyMessage,
}) => {
  // A failed search must not read as "no matches": that invites creating a duplicate of an existing contact
  if (isError) {
    return <InlineQueryError message="Could not search contacts." onRetry={onRetry} isRetrying={isLoading} className="m-2" />
  }

  if (hasResults) return null

  if (isLoading) {
    return <p className="px-2 py-6 text-center text-xs text-muted-foreground">Searching contacts…</p>
  }

  return emptyMessage ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</p> : null
}
