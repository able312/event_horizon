import type {
  IcsImportCommitResult,
  IcsImportParsedPayload,
  IcsImportReviewPayload,
} from "~/definitions/events/icsImport"
import { getEventsByCalendarIds, getEventsStartingBetween, importCalendarEvents } from "~/lib/data/events"
import {
  buildIcsImportCommitResult,
  buildIcsImportReview,
  createIcsImportSummary,
  getImportableStartRange,
  getImportableUids,
  selectIcsImportRows,
  toIcsImportEventInput,
} from "~/lib/events/icsImportReview"

/** Checks parsed calendar rows against existing events and summarizes the result for review. */
export async function reviewIcsImport(parsed: IcsImportParsedPayload): Promise<IcsImportReviewPayload> {
  const uids = getImportableUids(parsed.rows)
  const startRange = getImportableStartRange(parsed.rows)

  const [eventsWithUids, eventsInRange] = await Promise.all([
    uids.length > 0 ? getEventsByCalendarIds(uids) : Promise.resolve([]),
    startRange ? getEventsStartingBetween(startRange.startFrom, startRange.startTo) : Promise.resolve([]),
  ])

  const rows = buildIcsImportReview(parsed.rows, {
    calendarIds: eventsWithUids.flatMap((event) => (event.calendarId ? [event.calendarId] : [])),
    scheduledEvents: eventsInRange,
  })

  return { ...parsed, rows, summary: createIcsImportSummary(rows) }
}

/** Imports the selected review rows. The back end re-checks calendar ids, so concurrent imports can't duplicate. */
export async function commitIcsImport(
  review: IcsImportReviewPayload,
  selectedRowIds: string[],
): Promise<IcsImportCommitResult> {
  const selection = selectIcsImportRows(review, selectedRowIds)
  const insertResult = await importCalendarEvents(selection.selected.map(toIcsImportEventInput))
  return buildIcsImportCommitResult(review, selection, insertResult)
}
