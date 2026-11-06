/** The loading flags a preview reads from each query hook it depends on. */
export type PreviewQueryState = {
  isSuccess: boolean
  isError: boolean
  isFetching: boolean
}

/**
 * Combines a preview's query flags into the dataReady/dataError PreviewDocument takes.
 * Ready only when every query has succeeded and none is refetching, so a PDF is never saved
 * from stale or missing data. Pass `false` for a query the preview does not print (e.g. a
 * hidden section); it then neither blocks readiness nor reports an error.
 */
export function combineQueryStates(queries: ReadonlyArray<PreviewQueryState | false>): {
  ready: boolean
  error: boolean
} {
  const included = queries.filter((query): query is PreviewQueryState => query !== false)
  return {
    ready: included.every((query) => query.isSuccess && !query.isFetching),
    error: included.some((query) => query.isError),
  }
}
