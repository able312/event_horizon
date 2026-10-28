import { afterEach, describe, expect, it, vi } from "vitest"

import type { HolidayEntry } from "../../src/definitions/holidays"
import {
  HOLIDAY_FEED_URL,
  MAX_ENTRIES,
  MAX_FEED_BYTES,
  checkReplacement,
  entriesBetween,
  fetchHolidayFeedText,
  parseHolidayFeed,
  sameEntries,
} from "./holidayFeed"
import { CANADIAN_HOLIDAYS_EXCERPT, EXCERPT_ENTRY_COUNT } from "./holidayFeed.fixture"

const NOW = new Date("2026-10-28T12:00:00Z")

type FakeEvent = { uid: string; start: string; end?: string | null; summary: string; extra?: string[] }

function vevent({ uid, start, end, summary, extra = [] }: FakeEvent): string {
  return [
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${start}`,
    ...(end === null ? [] : [`DTEND;VALUE=DATE:${end ?? nextDay(start)}`]),
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    ...extra,
    "END:VEVENT",
  ].join("\r\n")
}

const compactDate = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, "")

function nextDay(compact: string): string {
  return compactDate(Date.UTC(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)) - 1, Number(compact.slice(6)) + 1))
}

/** Distinct single-day entries in March 2027, so a synthetic feed passes the size checks. */
function filler(count = 25): FakeEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `filler-${i}@test`,
    start: `202703${String(i + 1).padStart(2, "0")}`,
    summary: `Filler ${i}`,
  }))
}

function calendar(events: Array<FakeEvent | string>): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test//EN",
    ...events.map((event) => (typeof event === "string" ? event : vevent(event))),
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}

const titlesOn = (entries: HolidayEntry[], date: string) =>
  entries.filter((entry) => entry.startDate <= date && entry.endDate > date).map((entry) => entry.title)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("parseHolidayFeed with the real feed", () => {
  const feed = parseHolidayFeed(CANADIAN_HOLIDAYS_EXCERPT, NOW)

  it("keeps every entry with its feed UID, and records the years covered", () => {
    expect(feed.entries).toHaveLength(EXCERPT_ENTRY_COUNT)
    expect(feed).toMatchObject({ firstYear: 2026, lastYear: 2028 })
    expect(feed.entries.every((entry) => entry.id.endsWith("@google.com"))).toBe(true)
  })

  it("places fixed and moving holidays on their dates two years ahead", () => {
    expect(titlesOn(feed.entries, "2027-12-25")).toEqual(["Christmas Day (regional holiday)"])
    expect(titlesOn(feed.entries, "2027-03-29")).toEqual(["Easter Monday (regional holiday)"])
    expect(titlesOn(feed.entries, "2027-10-11")).toEqual(["Thanksgiving Day (regional holiday)"])
    expect(titlesOn(feed.entries, "2028-05-22")).toEqual(["Victoria Day (regional holiday)"])
    expect(titlesOn(feed.entries, "2028-04-16")).toEqual(["Easter Sunday", "Orthodox Easter Sunday"])
  })

  it("keeps the exclusive end, including across the new year", () => {
    const newYearsEve = feed.entries.find((entry) => entry.startDate === "2028-12-31")
    expect(newYearsEve).toMatchObject({ title: "New Year's Eve", endDate: "2029-01-01" })
    expect(entriesBetween(feed.entries, "2029-01-01", "2029-02-01")).toEqual([])
  })

  it("lists every name on a date with several", () => {
    expect(titlesOn(feed.entries, "2027-08-02")).toEqual([
      "Civic/Provincial Day",
      "Heritage Day (Alberta)",
      "Natal Day (Nova Scotia)",
      "Terry Fox Day (Manitoba)",
    ])
  })

  it("gives the same dates whatever the machine's time zone", () => {
    for (const [tz, offset] of [["Pacific/Kiritimati", -840], ["America/Los_Angeles", 480]] as const) {
      vi.stubEnv("TZ", tz)
      expect(new Date(2027, 0, 1).getTimezoneOffset()).toBe(offset)
      expect(parseHolidayFeed(CANADIAN_HOLIDAYS_EXCERPT, NOW).entries).toEqual(feed.entries)
    }
  })
})

describe("parseHolidayFeed details", () => {
  it("unfolds lines and unescapes titles", () => {
    const folded = "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270624\r\nDTEND;VALUE=DATE:20270625\r\nUID:sjb@test\r\n" +
      "SUMMARY:Saint-Jean-Baptiste\\, Fête nat\r\n ionale du Québec\\; Quebec\r\nEND:VEVENT"
    const { entries } = parseHolidayFeed(calendar([...filler(), folded]), NOW)
    expect(titlesOn(entries, "2027-06-24")).toEqual(["Saint-Jean-Baptiste, Fête nationale du Québec; Quebec"])
  })

  it("keeps multi-day spans and treats a missing end as one day", () => {
    const { entries } = parseHolidayFeed(calendar([
      ...filler(),
      { uid: "span@test", start: "20261230", end: "20270103", summary: "Winter Break" },
      { uid: "noend@test", start: "20270210", end: null, summary: "No End" },
    ]), NOW)
    expect(entries.find((entry) => entry.id === "span@test")).toMatchObject({ startDate: "2026-12-30", endDate: "2027-01-03" })
    expect(entries.find((entry) => entry.id === "noend@test")).toMatchObject({ startDate: "2027-02-10", endDate: "2027-02-11" })
    // A span starting in December still shows in January, and not after its exclusive end.
    expect(entriesBetween(entries, "2027-01-01", "2027-02-01").map((entry) => entry.id)).toEqual(["span@test"])
    expect(titlesOn(entries, "2027-01-03")).toEqual([])
  })

  it("drops duplicates and cancelled entries", () => {
    const { entries } = parseHolidayFeed(calendar([
      ...filler(),
      { uid: "dup@test", start: "20270401", summary: "Old Title", extra: ["SEQUENCE:0"] },
      { uid: "dup@test", start: "20270401", summary: "New Title", extra: ["SEQUENCE:1"] },
      { uid: "copy-a@test", start: "20270402", summary: "Same Day" },
      { uid: "copy-b@test", start: "20270402", summary: "Same Day" },
      { uid: "gone@test", start: "20270403", summary: "Cancelled", extra: ["STATUS:CANCELLED"] },
    ]), NOW)
    expect(titlesOn(entries, "2027-04-01")).toEqual(["New Title"])
    expect(titlesOn(entries, "2027-04-02")).toEqual(["Same Day"])
    expect(titlesOn(entries, "2027-04-03")).toEqual([])
  })

  it("expands recurring entries within a bounded window, honouring exclusions and overrides", () => {
    const series = [
      vevent({ uid: "yearly@test", start: "20250701", summary: "Yearly", extra: ["RRULE:FREQ=YEARLY", "EXDATE;VALUE=DATE:20270701"] }),
      vevent({ uid: "yearly@test", start: "20280703", summary: "Yearly (moved)", extra: ["RECURRENCE-ID;VALUE=DATE:20280701"] }),
      vevent({ uid: "yearly@test", start: "20290701", summary: "Yearly", extra: ["RECURRENCE-ID;VALUE=DATE:20290701", "STATUS:CANCELLED"] }),
    ]
    const { entries } = parseHolidayFeed(calendar([...filler(), ...series]), NOW)
    const yearly = entries.filter((entry) => entry.id.startsWith("yearly@test"))
    // 2025 to 2029 (current year + 3), less the excluded 2027 and cancelled 2029.
    expect(yearly.map((entry) => [entry.startDate, entry.title])).toEqual([
      ["2025-07-01", "Yearly"],
      ["2026-07-01", "Yearly"],
      ["2028-07-03", "Yearly (moved)"],
    ])
    expect(yearly[2].id).toBe("yearly@test#2028-07-01")
  })

  it("rejects incomplete, malformed, empty, oversized and outdated feeds", () => {
    const complete = calendar(filler())
    expect(() => parseHolidayFeed(complete.slice(0, complete.length / 2), NOW)).toThrow("incomplete")
    expect(() => parseHolidayFeed("<html>Not found</html>\nEND:VCALENDAR", NOW)).toThrow("not a valid calendar")
    expect(() => parseHolidayFeed(calendar([]), NOW)).toThrow("only 0 entries")
    expect(() => parseHolidayFeed(calendar(filler(5)), NOW)).toThrow("only 5 entries")
    const tooMany = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({
      uid: `n-${i}@test`, start: compactDate(Date.UTC(2027, 0, 1 + i)), summary: `Day ${i}`,
    }))
    expect(() => parseHolidayFeed(calendar(tooMany), NOW)).toThrow("more than")
    const old = filler().map((event) => ({ ...event, start: event.start.replace("2027", "2025") }))
    expect(() => parseHolidayFeed(calendar(old), NOW)).toThrow("stops in 2025")
    expect(() => parseHolidayFeed(calendar([...filler(), { uid: "long@test", start: "20270501", summary: "x".repeat(300) }]), NOW))
      .toThrow("too long")
  })
})

describe("replacement checks", () => {
  const entry = (id: string): HolidayEntry => ({ id, title: id, startDate: "2027-01-01", endDate: "2027-01-02" })

  it("refuses a feed that lost more than half the cached entries", () => {
    const feed = { entries: Array.from({ length: 40 }, (_, i) => entry(`e${i}`)), firstYear: 2027, lastYear: 2027 }
    expect(checkReplacement(null, feed)).toBeNull()
    expect(checkReplacement(80, feed)).toBeNull()
    expect(checkReplacement(81, feed)).toMatch("dropped from 81 to 40")
  })

  it("compares entries field by field", () => {
    expect(sameEntries([entry("a")], [entry("a")])).toBe(true)
    expect(sameEntries([entry("a")], [{ ...entry("a"), title: "b" }])).toBe(false)
    expect(sameEntries([entry("a")], [])).toBe(false)
  })
})

describe("fetchHolidayFeedText", () => {
  it("fetches only the fixed Google feed", async () => {
    const fetchMock = vi.fn(async () => new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchHolidayFeedText()).resolves.toContain("BEGIN:VCALENDAR")
    expect(fetchMock).toHaveBeenCalledWith(HOLIDAY_FEED_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it("fails on HTTP errors, unreachable hosts and oversized responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })))
    await expect(fetchHolidayFeedText()).rejects.toThrow("HTTP 503")
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down") }))
    await expect(fetchHolidayFeedText()).rejects.toThrow("could not be reached")
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { headers: { "Content-Length": String(MAX_FEED_BYTES + 1) } })))
    await expect(fetchHolidayFeedText()).rejects.toThrow("too large")
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(MAX_FEED_BYTES + 1))))
    await expect(fetchHolidayFeedText()).rejects.toThrow("too large")
  })
})
