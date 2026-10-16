import type { PreviewPreferencesState } from "../preferences/types"

interface PreviewReturnState {
  scrollTop: number
  preferences: PreviewPreferencesState
}

// Short-lived return tickets keep layout options out of URLs and survive route unmounts.
const returnStates = new Map<string, PreviewReturnState>()
const MAX_RETURN_STATES = 20

export function savePreviewReturnState(
  location: { pathname: string; search: string; hash: string },
  state: PreviewReturnState,
): string {
  const ticket = crypto.randomUUID()
  returnStates.set(ticket, state)
  if (returnStates.size > MAX_RETURN_STATES) {
    const oldest = returnStates.keys().next().value
    if (oldest) returnStates.delete(oldest)
  }
  const params = new URLSearchParams(location.search)
  params.set("resume", ticket)
  return `${location.pathname}?${params.toString()}${location.hash}`
}

export function getPreviewReturnState(searchParams: URLSearchParams): PreviewReturnState | undefined {
  return returnStates.get(searchParams.get("resume") ?? "")
}
