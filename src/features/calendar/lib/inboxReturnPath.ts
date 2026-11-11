/**
 * Where an event opened from the Inbox returns to: the Inbox, keeping the
 * calendar's other URL state (month, filters) but not a search, which would
 * replace the Inbox with results.
 */
export function inboxReturnPath(currentSearch: string): string {
  const params = new URLSearchParams(currentSearch)
  params.set("view", "inbox")
  params.delete("search")
  return `/events?${params.toString()}`
}
