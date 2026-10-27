import { afterEach, describe, expect, it, vi } from "vitest"
import { getAccessToken, googleEventIdFor, parseGoogleCalendarLink, readGoogleCalendarConfig, saveGoogleCalendarEvent, type GoogleCalendarConfig } from "./googleCalendar"

const config: GoogleCalendarConfig = { clientId: "client", clientSecret: "secret", refreshToken: "refresh", calendarId: "venue@group.calendar.google.com" }
const body = { summary: "Dinner", description: "EVENT TYPE: Function", start: { dateTime: "2026-05-12T18:30:00.000Z" }, end: { dateTime: "2026-05-12T21:00:00.000Z" } }
const eventsUrl = "https://www.googleapis.com/calendar/v3/calendars/venue%40group.calendar.google.com/events"

type Reply = { status: number; json: object }
type Call = { method: string; url: string; body: unknown }

/** Answers each request with the first matching reply; the token request always succeeds unless overridden. */
function fakeGoogle(routes: Record<string, Reply>) {
  const calls: Call[] = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET"
    const isCalendarCall = url.startsWith(eventsUrl) && typeof init.body === "string"
    calls.push({ method, url, body: isCalendarCall ? JSON.parse(init.body as string) : init.body })
    const reply = routes[`${method} ${url}`] ?? (url.startsWith("https://oauth2") ? { status: 200, json: { access_token: "token" } } : { status: 500, json: { error: { message: `unexpected ${method} ${url}` } } })
    return new Response(JSON.stringify(reply.json), { status: reply.status })
  }))
  return calls
}
const savedEvent = (id: string) => ({ id, iCalUID: `${id}@google.com`, htmlLink: `https://www.google.com/calendar/event?eid=${id}` })
const eid = (eventId: string, calendar = "venue@group.calendar.google.com") => btoa(`${eventId} ${calendar}`).replace(/=+$/, "")

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("readGoogleCalendarConfig", () => {
  it("refuses until every env var is set", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client")
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "secret")
    vi.stubEnv("GOOGLE_CALENDAR_REFRESH_TOKEN", " ")
    vi.stubEnv("GOOGLE_CALENDAR_ID", "venue@group.calendar.google.com")
    expect(() => readGoogleCalendarConfig()).toThrow("isn't set up")
    expect(console.error).toHaveBeenCalledWith("Google Calendar env vars missing: GOOGLE_CALENDAR_REFRESH_TOKEN")
    vi.stubEnv("GOOGLE_CALENDAR_REFRESH_TOKEN", "refresh")
    expect(readGoogleCalendarConfig()).toEqual(config)
  })
})

describe("googleEventIdFor", () => {
  it("is a fixed, valid Google event ID", () => {
    const id = googleEventIdFor("j57abc123xyz")
    expect(id).toBe(googleEventIdFor("j57abc123xyz"))
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/)
    expect(id).not.toBe(googleEventIdFor("j57abc123xy"))
  })
})

describe("parseGoogleCalendarLink", () => {
  it("reads iCalUIDs, eids, event links and raw IDs", () => {
    expect(parseGoogleCalendarLink("abc123def@google.com")).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(" imported-uid@example.com ")).toEqual({ iCalUID: "imported-uid@example.com" })
    expect(parseGoogleCalendarLink(eid("abc123def"))).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(eid("abc123def", "venue@g").replace(/\+/g, "-").replace(/\//g, "_"))).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(`https://www.google.com/calendar/event?eid=${eid("abc123def")}`)).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(`https://calendar.google.com/calendar/u/0/r/eventedit/${eid("abc123def")}?pli=1`)).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink("4k3j2h1g0f9e8d7c6b5a")).toEqual({ eventId: "4k3j2h1g0f9e8d7c6b5a" })
    expect(parseGoogleCalendarLink("abc123def_20260512T183000Z")).toEqual({ eventId: "abc123def_20260512T183000Z" })
  })

  it("rejects anything else", () => {
    for (const value of ["", "not an id", "https://example.com/somewhere", "ab"]) {
      expect(() => parseGoogleCalendarLink(value)).toThrow("isn't one Event Horizon recognises")
    }
  })
})

describe("getAccessToken", () => {
  it("exchanges the refresh token", async () => {
    const calls = fakeGoogle({})
    expect(await getAccessToken(config)).toBe("token")
    expect(String(calls[0]!.body)).toContain("grant_type=refresh_token")
    expect(String(calls[0]!.body)).toContain("refresh_token=refresh")
  })

  it("asks for a new sign-in when the token was revoked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fakeGoogle({ "POST https://oauth2.googleapis.com/token": { status: 400, json: { error: "invalid_grant" } } })
    await expect(getAccessToken(config)).rejects.toThrow("expired or was removed")
  })
})

describe("saveGoogleCalendarEvent", () => {
  it("creates an unlinked event with the fixed ID", async () => {
    const calls = fakeGoogle({ [`POST ${eventsUrl}`]: { status: 200, json: savedEvent("ehnew") } })
    expect(await saveGoogleCalendarEvent(config, { linkedCalendarId: null, newEventId: "ehnew", body })).toEqual({
      iCalUID: "ehnew@google.com", eventUrl: "https://calendar.google.com/calendar/event?eid=ehnew",
    })
    expect(calls[1]).toMatchObject({ method: "POST", body: { ...body, id: "ehnew" } })
    expect(calls[0]!.url).toBe("https://oauth2.googleapis.com/token")
  })

  it("updates (and restores) the existing copy when the fixed ID is taken", async () => {
    const calls = fakeGoogle({
      [`POST ${eventsUrl}`]: { status: 409, json: { error: { message: "duplicate" } } },
      [`PATCH ${eventsUrl}/ehnew`]: { status: 200, json: savedEvent("ehnew") },
    })
    expect((await saveGoogleCalendarEvent(config, { linkedCalendarId: "  ", newEventId: "ehnew", body })).iCalUID).toBe("ehnew@google.com")
    expect(calls[2]).toMatchObject({ method: "PATCH", body: { ...body, status: "confirmed" } })
  })

  it("updates a linked Google event by its ID", async () => {
    const calls = fakeGoogle({ [`PATCH ${eventsUrl}/abc123def`]: { status: 200, json: savedEvent("abc123def") } })
    await saveGoogleCalendarEvent(config, { linkedCalendarId: eid("abc123def"), newEventId: "ehnew", body })
    expect(calls.map(call => call.method)).toEqual(["POST", "PATCH"])
  })

  it("finds an imported iCalUID before updating", async () => {
    const lookup = `GET ${eventsUrl}?iCalUID=imported%40example.com&showDeleted=true&maxResults=1`
    fakeGoogle({
      [lookup]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`PATCH ${eventsUrl}/importedid`]: { status: 200, json: { ...savedEvent("importedid"), iCalUID: "imported@example.com" } },
    })
    expect((await saveGoogleCalendarEvent(config, { linkedCalendarId: "imported@example.com", newEventId: "ehnew", body })).iCalUID).toBe("imported@example.com")
  })

  it("explains a linked event that isn't on the shared calendar", async () => {
    fakeGoogle({
      [`PATCH ${eventsUrl}/gone12345`]: { status: 404, json: {} },
      [`GET ${eventsUrl}?iCalUID=missing%40example.com&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [] } },
    })
    await expect(saveGoogleCalendarEvent(config, { linkedCalendarId: "gone12345", newEventId: "ehnew", body })).rejects.toThrow("isn't on the shared calendar")
    await expect(saveGoogleCalendarEvent(config, { linkedCalendarId: "missing@example.com", newEventId: "ehnew", body })).rejects.toThrow("isn't on the shared calendar")
  })

  it("maps Google refusals to messages for the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fakeGoogle({ [`POST ${eventsUrl}`]: { status: 403, json: { error: { message: "Forbidden" } } } })
    await expect(saveGoogleCalendarEvent(config, { linkedCalendarId: null, newEventId: "ehnew", body })).rejects.toThrow("make changes to events")
    fakeGoogle({ [`POST ${eventsUrl}`]: { status: 503, json: {} } })
    await expect(saveGoogleCalendarEvent(config, { linkedCalendarId: null, newEventId: "ehnew", body })).rejects.toThrow("Try again in a minute")
    expect(console.error).toHaveBeenCalledWith("Google Calendar create failed (403): Forbidden")
  })
})
