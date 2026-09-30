import { InlineQueryError } from "~/features/contacts/components/InlineQueryError"

type ClientNamesErrorProps = {
  query: { isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> }
}

/** Without this, a failed client lookup would make every event look like it has no client. */
export const ClientNamesError: React.FC<ClientNamesErrorProps> = ({ query }) =>
  query.isError ? (
    <InlineQueryError
      message="Could not load client names, so events may appear without a client."
      onRetry={() => void query.refetch()}
      isRetrying={query.isFetching}
      className="mx-4 my-2 shrink-0"
    />
  ) : null
