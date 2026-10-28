import ICAL from "ical.js"

import type { HolidayEntry } from "../../src/definitions/holidays"

// Google's public Canadian holiday calendar: parsing and validation, kept free of
// Convex so it can be tested directly. Holidays are all-day civil dates, so every
// date here is a YYYY-MM-DD string; none of them pass through a timestamp.

/** The only source the refresh fetches. Never take a URL from a caller. */
export const HOLIDAY_FEED_URL =
  "https://calendar.google.com/calendar/ical/en.canadian%23holiday%40group.v.calendar.google.com/public/basic.ics"
/** Key for the cache and sync documents of this source. */
export const HOLIDAY_SOURCE = "google:en.canadian"

export const FETCH_TIMEOUT_MS = 20_000
/** The feed is ~200 KB; anything near this is not the feed we expect. */
export const MAX_FEED_BYTES = 2_000_000
/** A real feed holds ~40 entries a year. Fewer than this is broken or truncated. */
export const MIN_ENTRIES = 20
/** Over this the feed has changed shape; reject rather than truncate. */
export const MAX_ENTRIES = 2_000
const MAX_TEXT_LENGTH = 200
/** Keeps the single cache document well under Convex's 1 MiB document limit. */
export const MAX_CACHE_BYTES = 600_000
/** A refresh that loses more than half the cached entries is treated as truncated. */
export const MIN_RETAINED_FRACTION = 0.5
/** Recurring entries (none in the feed today) expand this many years past the current one... */
const RECURRENCE_YEARS_AHEAD = 3
/** ...and a series with more occurrences than this in the window is rejected. */
const MAX_OCCURRENCES_PER_SERIES = 400

export class HolidayFeedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "HolidayFeedError"
  }
}

export type HolidayFeed = {
  entries: HolidayEntry[]
  firstYear: number
  lastYear: number
}

type IcalComponent = InstanceType<typeof ICAL.Component>
type IcalTime = InstanceType<typeof ICAL.Time>

// ============================================================================
// Civil dates
// ============================================================================

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0")
}

/** Date.UTC only does the calendar arithmetic (it rolls day 32 into the next month); no time zone is involved. */
function toDateKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day))
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  return toDateKey(year, month, day + days)
}

/** The date as written in the feed. Timed entries keep their written date rather than shifting to UTC. */
function timeToDateKey(time: IcalTime): string {
  return toDateKey(time.year, time.month, time.day)
}

// ============================================================================
// Parsing
// ============================================================================

function cleanText(value: unknown, field: string): string {
  if (typeof value !== "string") throw new HolidayFeedError(`An entry has no ${field}`)
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) throw new HolidayFeedError(`An entry has an empty ${field}`)
  if (text.length > MAX_TEXT_LENGTH) throw new HolidayFeedError(`An entry's ${field} is too long`)
  return text
}

function isCancelled(component: IcalComponent): boolean {
  const status = component.getFirstPropertyValue("status")
  return typeof status === "string" && status.toUpperCase() === "CANCELLED"
}

function sequenceOf(component: IcalComponent): number {
  const value = component.getFirstPropertyValue("sequence")
  return typeof value === "number" ? value : 0
}

/** Start and exclusive end. A missing or non-advancing end means one day, as RFC 5545 does for dates. */
function toSpan(start: IcalTime, end: IcalTime | null): { startDate: string; endDate: string } {
  const startDate = timeToDateKey(start)
  let endDate = end ? timeToDateKey(end) : startDate
  // A timed entry ending later on a day counts that day.
  if (end && !end.isDate && (end.hour > 0 || end.minute > 0 || end.second > 0)) endDate = addDays(endDate, 1)
  if (endDate <= startDate) endDate = addDays(startDate, 1)
  return { startDate, endDate }
}

type Series = { master: IcalComponent | null; exceptions: IcalComponent[] }

/** Groups components by UID. Repeated copies of one entry keep the highest SEQUENCE (the later copy on a tie). */
function groupByUid(components: IcalComponent[]): Map<string, Series> {
  const series = new Map<string, Series>()
  for (const component of components) {
    const uid = cleanText(component.getFirstPropertyValue("uid"), "UID")
    const group = series.get(uid) ?? { master: null, exceptions: [] }
    if (component.hasProperty("recurrence-id")) group.exceptions.push(component)
    else if (!group.master || sequenceOf(component) >= sequenceOf(group.master)) group.master = component
    series.set(uid, group)
  }
  return series
}

function singleEntry(id: string, component: IcalComponent): HolidayEntry | null {
  if (isCancelled(component)) return null
  const event = new ICAL.Event(component)
  if (!event.startDate) throw new HolidayFeedError("An entry has no start date")
  return {
    id,
    title: cleanText(event.summary, "title"),
    ...toSpan(event.startDate, event.endDate ?? null),
  }
}

type Window = { start: string; endExclusive: string }

/** Expands a recurring entry inside the window, applying EXDATEs and overridden or cancelled occurrences. */
function expandSeries(uid: string, group: Series & { master: IcalComponent }, window: Window): HolidayEntry[] {
  const event = new ICAL.Event(group.master)
  for (const exception of group.exceptions) event.relateException(exception)
  const iterator = event.iterator()
  const entries: HolidayEntry[] = []
  let count = 0
  for (let next = iterator.next(); next; next = iterator.next()) {
    const occurrenceKey = timeToDateKey(next)
    if (occurrenceKey >= window.endExclusive) break
    if (++count > MAX_OCCURRENCES_PER_SERIES) throw new HolidayFeedError(`A recurring entry repeats too often`)
    const details = event.getOccurrenceDetails(next)
    if (isCancelled(details.item.component)) continue
    const span = toSpan(details.startDate, details.endDate)
    if (span.endDate <= window.start) continue
    entries.push({ id: `${uid}#${occurrenceKey}`, title: cleanText(details.item.summary, "title"), ...span })
  }
  return entries
}

/** One entry per holiday and date: the same title on the same span from another UID is a duplicate. */
function dedupeAndSort(entries: HolidayEntry[]): HolidayEntry[] {
  const unique = new Map<string, HolidayEntry>()
  for (const entry of entries) {
    const key = `${entry.startDate}|${entry.endDate}|${entry.title.toLowerCase()}`
    if (!unique.has(key)) unique.set(key, entry)
  }
  return [...unique.values()].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  )
}

/**
 * Parses the feed into holiday entries. Throws HolidayFeedError for anything that
 * isn't a complete, plausible feed, so the caller keeps its previous data.
 * `now` only bounds how far recurring entries expand.
 */
export function parseHolidayFeed(text: string, now: Date): HolidayFeed {
  if (!/END:VCALENDAR\s*$/.test(text)) throw new HolidayFeedError("The feed is incomplete")
  let calendar: IcalComponent
  try {
    calendar = new ICAL.Component(ICAL.parse(text))
  } catch {
    throw new HolidayFeedError("The feed is not a valid calendar")
  }
  if (calendar.name !== "vcalendar") throw new HolidayFeedError("The feed is not a calendar")

  const series = groupByUid(calendar.getAllSubcomponents("vevent"))
  const entries: HolidayEntry[] = []
  const recurring: Array<[string, Series & { master: IcalComponent }]> = []
  for (const [uid, group] of series) {
    if (group.master && new ICAL.Event(group.master).isRecurring()) {
      recurring.push([uid, { ...group, master: group.master }])
      continue
    }
    const master = group.master ? singleEntry(uid, group.master) : null
    if (master) entries.push(master)
    // Overrides without a recurring master are standalone entries.
    for (const exception of group.exceptions) {
      const entry = singleEntry(`${uid}#${timeToDateKey(new ICAL.Event(exception).recurrenceId)}`, exception)
      if (entry) entries.push(entry)
    }
  }

  // Recurring entries expand over the years the dated entries cover (and at least a few years ahead), never unbounded.
  const currentYear = now.getUTCFullYear()
  const years = entries.map((entry) => Number(entry.startDate.slice(0, 4)))
  const window: Window = {
    start: `${pad(Math.min(currentYear - 1, ...years), 4)}-01-01`,
    endExclusive: `${pad(Math.max(currentYear + RECURRENCE_YEARS_AHEAD, ...years) + 1, 4)}-01-01`,
  }
  for (const [uid, group] of recurring) entries.push(...expandSeries(uid, group, window))

  const unique = dedupeAndSort(entries)
  if (unique.length < MIN_ENTRIES) throw new HolidayFeedError(`The feed has only ${unique.length} entries`)
  if (unique.length > MAX_ENTRIES) throw new HolidayFeedError(`The feed has ${unique.length} entries, more than the ${MAX_ENTRIES} allowed`)
  if (JSON.stringify(unique).length > MAX_CACHE_BYTES) throw new HolidayFeedError("The feed is too large to cache")

  const startYears = unique.map((entry) => Number(entry.startDate.slice(0, 4)))
  const feed = { entries: unique, firstYear: Math.min(...startYears), lastYear: Math.max(...startYears) }
  if (feed.lastYear < currentYear) throw new HolidayFeedError(`The feed stops in ${feed.lastYear}`)
  return feed
}

/** Why a valid-looking feed shouldn't replace the cache, or null when it can. */
export function checkReplacement(previousCount: number | null, next: HolidayFeed): string | null {
  if (previousCount !== null && next.entries.length < previousCount * MIN_RETAINED_FRACTION) {
    return `The feed dropped from ${previousCount} to ${next.entries.length} entries`
  }
  return null
}

export function sameEntries(a: HolidayEntry[], b: HolidayEntry[]): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index]
      return (
        entry.id === other.id &&
        entry.title === other.title &&
        entry.startDate === other.startDate &&
        entry.endDate === other.endDate
      )
    })
  )
}

/** Entries overlapping [start, endExclusive). Ranges are YYYY-MM-DD with exclusive ends, so string order is date order. */
export function entriesBetween(entries: HolidayEntry[], start: string, endExclusive: string): HolidayEntry[] {
  return entries.filter((entry) => entry.startDate < endExclusive && entry.endDate > start)
}

// ============================================================================
// Fetching
// ============================================================================

/** Reads at most maxBytes, so an oversized response can't exhaust the action's memory. */
async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("Content-Length") ?? 0)
  if (declared > maxBytes) throw new HolidayFeedError("The feed is too large")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new HolidayFeedError("The feed is too large")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

/** Downloads the fixed feed with a timeout and a size limit. */
export async function fetchHolidayFeedText(): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let response: Response
    try {
      response = await fetch(HOLIDAY_FEED_URL, { signal: controller.signal, headers: { Accept: "text/calendar" } })
    } catch {
      throw new HolidayFeedError(controller.signal.aborted ? "The feed timed out" : "The feed could not be reached")
    }
    if (!response.ok) throw new HolidayFeedError(`The feed returned HTTP ${response.status}`)
    return await readCapped(response, MAX_FEED_BYTES)
  } finally {
    clearTimeout(timeout)
  }
}
