import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventRequest } from "~/definitions/database"
import { EVENT_TYPE_LABELS } from "~/definitions/events/ui"

import { requestClientName, requestTitle } from "./eventRequestPrefill"

/** Lowercased words of the query; every one must appear somewhere in the item. */
function searchWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

function matchesWords(haystack: Array<string | null | undefined>, words: string[]): boolean {
  const text = haystack.filter(Boolean).join(" ").toLowerCase()
  return words.every((word) => text.includes(word))
}

/** Requests whose title, client, contact details, type or description match the Inbox search. */
export function filterInboxRequests(requests: EventRequest[], query: string): EventRequest[] {
  const words = searchWords(query)
  if (words.length === 0) return requests
  return requests.filter((request) =>
    matchesWords(
      [
        requestTitle(request),
        requestClientName(request),
        request.organizationName,
        request.email,
        request.phone,
        EVENT_TYPE_LABELS[request.eventType],
        request.details,
      ],
      words,
    ),
  )
}

/** New leads whose title, type or primary client match the Inbox search. */
export function filterInboxLeads(
  leads: Event[],
  clientsByEventId: Record<string, PrimaryClient> | undefined,
  query: string,
): Event[] {
  const words = searchWords(query)
  if (words.length === 0) return leads
  return leads.filter((lead) => {
    const client = clientsByEventId?.[lead.id]
    return matchesWords([lead.title, EVENT_TYPE_LABELS[lead.type], client?.displayName, client?.email], words)
  })
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** When a request arrived, as short as it can be: "2:14 PM" today, "Yesterday", "Oct 3", or "Oct 3, 2025" in another year. */
export function formatReceivedAt(iso: string, now: Date = new Date()): string {
  const received = new Date(iso)
  if (Number.isNaN(received.getTime())) return ""
  if (isSameLocalDay(received, now)) {
    return received.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameLocalDay(received, yesterday)) return "Yesterday"
  return received.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(received.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  })
}
