import { afterEach, describe, expect, it, vi } from "vitest"
import { deleteGoogleCalendarEvent, findGoogleCalendarEventUrl, getAccessToken, googleEventIdFor, parseGoogleCalendarLink, readGoogleCalendarConfig, saveGoogleCalendarEvent, type GoogleCalendarConfig } from "./googleCalendar"

const config: GoogleCalendarConfig = { clientId: "client", clientSecret: "secret", refreshToken: "refresh", calendarId: "venue@group.calendar.google.com" }
const body = { summary: "Dinner", description: "EVENT TYPE: Function", start: { dateTime: "2026-05-12T18:30:00.000Z" }, end: { dateTime: "2026-05-12T21:00:00.000Z" } }
const eventsUrl = "https://www.googleapis.com/calendar/v3/calendars/venue%40group.calendar.google.com/events"

type Reply = { status: number; json: object }
type Call = { method: string; url: string; body: unknown }

/**
 * Answers each request with the matching reply. Unless overridden, the token request
 * succeeds and an iCalUID lookup finds nothing.
 */
function fakeGoogle(routes: Record<string, Reply>) {
  const calls: Call[] = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET"
    const isCalendarCall = url.startsWith(eventsUrl) && typeof init.body === "string"
    calls.push({ method, url, body: isCalendarCall ? JSON.parse(init.body as string) : init.body })
    const reply = routes[`${method} ${url}`]
      ?? (url.startsWith("https://oauth2") ? { status: 200, json: { access_token: "token" } }
        : method === "GET" && url.startsWith(`${eventsUrl}?iCalUID=`) ? { status: 200, json: { items: [] } }
          : { status: 500, json: { error: { message: `unexpected ${method} ${url}` } } })
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.json), { status: reply.status })
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
    expect(parseGoogleCalendarLink("abc123def@google.com")).toEqual({ iCalUID: "abc123def@google.com", eventIdIfNoMatch: "abc123def" })
    expect(parseGoogleCalendarLink(" imported-uid@example.com ")).toEqual({ iCalUID: "imported-uid@example.com" })
    expect(parseGoogleCalendarLink(eid("abc123def"))).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(eid("abc123def", "venue@g").replace(/\+/g, "-").replace(/\//g, "_"))).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(`https://www.google.com/calendar/event?eid=${eid("abc123def")}`)).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink(`https://calendar.google.com/calendar/u/0/r/eventedit/${eid("abc123def")}?pli=1`)).toEqual({ eventId: "abc123def" })
    expect(parseGoogleCalendarLink("4k3j2h1g0f9e8d7c6b5a")).toEqual({ iCalUID: "4k3j2h1g0f9e8d7c6b5a", eventIdIfNoMatch: "4k3j2h1g0f9e8d7c6b5a" })
    expect(parseGoogleCalendarLink("abc123def_20260512T183000Z")).toEqual({ iCalUID: "abc123def_20260512T183000Z", eventIdIfNoMatch: "abc123def_20260512T183000Z" })
  })

  it("treats anything else as an imported iCalUID", () => {
    for (const value of ["550e8400-e29b-41d4-a716-446655440000", "not an id", "https://example.com/somewhere", "ab"]) {
      expect(parseGoogleCalendarLink(value)).toEqual({ iCalUID: value })
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
      link: "ehnew@google.com", eventUrl: "https://calendar.google.com/calendar/event?eid=ehnew",
    })
    expect(calls[1]).toMatchObject({ method: "POST", body: { ...body, id: "ehnew" } })
    expect(calls[0]!.url).toBe("https://oauth2.googleapis.com/token")
  })

  it("updates (and restores) the existing copy when the fixed ID is taken", async () => {
    const calls = fakeGoogle({
      [`POST ${eventsUrl}`]: { status: 409, json: { error: { message: "duplicate" } } },
      [`PATCH ${eventsUrl}/ehnew`]: { status: 200, json: savedEvent("ehnew") },
    })
    expect((await saveGoogleCalendarEvent(config, { linkedCalendarId: "  ", newEventId: "ehnew", body })).link).toBe("ehnew@google.com")
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
    expect((await saveGoogleCalendarEvent(config, { linkedCalendarId: "imported@example.com", newEventId: "ehnew", body })).link).toBe("imported@example.com")
  })

  it("finds an imported iCalUID without an at-sign before updating", async () => {
    const uid = "550e8400-e29b-41d4-a716-446655440000"
    fakeGoogle({
      [`GET ${eventsUrl}?iCalUID=${uid}&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`PATCH ${eventsUrl}/importedid`]: { status: 200, json: { ...savedEvent("importedid"), iCalUID: uid } },
    })
    expect((await saveGoogleCalendarEvent(config, { linkedCalendarId: uid, newEventId: "ehnew", body })).link).toBe(uid)
  })

  it("prefers a matching iCalUID over the same value as an event ID", async () => {
    const calls = fakeGoogle({
      [`GET ${eventsUrl}?iCalUID=imported123&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`PATCH ${eventsUrl}/importedid`]: { status: 200, json: { ...savedEvent("importedid"), iCalUID: "imported123" } },
    })
    await saveGoogleCalendarEvent(config, { linkedCalendarId: "imported123", newEventId: "ehnew", body })
    expect(calls.at(-1)!.url).toBe(`${eventsUrl}/importedid`)
  })

  it("keeps a linked occurrence of a repeating event linked to that occurrence", async () => {
    const occurrence = "series123_20260512T183000Z"
    const calls = fakeGoogle({
      [`PATCH ${eventsUrl}/${occurrence}`]: {
        status: 200,
        json: { ...savedEvent(occurrence), iCalUID: "series123@google.com", recurringEventId: "series123" },
      },
    })
    const saved = await saveGoogleCalendarEvent(config, { linkedCalendarId: eid(occurrence), newEventId: "ehnew", body })
    expect(saved.link).toBe(occurrence)
    await saveGoogleCalendarEvent(config, { linkedCalendarId: saved.link, newEventId: "ehnew", body })
    expect(calls.filter(call => call.method === "PATCH").map(call => call.url)).toEqual([`${eventsUrl}/${occurrence}`, `${eventsUrl}/${occurrence}`])
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

describe("findGoogleCalendarEventUrl", () => {
  it("reads the linked event's link, looking up imported iCalUIDs", async () => {
    fakeGoogle({
      [`GET ${eventsUrl}/abc123def`]: { status: 200, json: savedEvent("abc123def") },
      [`GET ${eventsUrl}?iCalUID=imported%40example.com&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`GET ${eventsUrl}/importedid`]: { status: 200, json: savedEvent("importedid") },
    })
    expect(await findGoogleCalendarEventUrl(config, "abc123def@google.com")).toBe("https://calendar.google.com/calendar/event?eid=abc123def")
    expect(await findGoogleCalendarEventUrl(config, "imported@example.com")).toBe("https://calendar.google.com/calendar/event?eid=importedid")
  })

  it("explains a linked event that is gone or deleted", async () => {
    fakeGoogle({
      [`GET ${eventsUrl}/gone12345`]: { status: 404, json: {} },
      [`GET ${eventsUrl}/deleted123`]: { status: 200, json: { ...savedEvent("deleted123"), status: "cancelled" } },
    })
    await expect(findGoogleCalendarEventUrl(config, "gone12345")).rejects.toThrow("isn't on the shared calendar")
    await expect(findGoogleCalendarEventUrl(config, "deleted123")).rejects.toThrow("isn't on the shared calendar")
  })
})

describe("deleteGoogleCalendarEvent", () => {
  it("deletes a linked Google event by its ID", async () => {
    const calls = fakeGoogle({ [`DELETE ${eventsUrl}/abc123def`]: { status: 204, json: {} } })
    expect(await deleteGoogleCalendarEvent(config, "abc123def@google.com")).toBe(true)
    expect(calls.map(call => call.method)).toEqual(["POST", "GET", "DELETE"])
  })

  it("finds an imported Google iCalUID whose event ID differs from it", async () => {
    fakeGoogle({
      [`GET ${eventsUrl}?iCalUID=original123%40google.com&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`DELETE ${eventsUrl}/importedid`]: { status: 204, json: {} },
    })
    expect(await deleteGoogleCalendarEvent(config, "original123@google.com")).toBe(true)
  })

  it("finds an imported iCalUID before deleting", async () => {
    fakeGoogle({
      [`GET ${eventsUrl}?iCalUID=imported%40example.com&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [{ id: "importedid" }] } },
      [`DELETE ${eventsUrl}/importedid`]: { status: 204, json: {} },
    })
    expect(await deleteGoogleCalendarEvent(config, "imported@example.com")).toBe(true)
  })

  it("reports nothing deleted when the event is already gone or nothing matches the link", async () => {
    const calls = fakeGoogle({
      [`DELETE ${eventsUrl}/gone12345`]: { status: 404, json: {} },
      [`DELETE ${eventsUrl}/deleted123`]: { status: 410, json: {} },
      [`GET ${eventsUrl}?iCalUID=missing%40example.com&showDeleted=true&maxResults=1`]: { status: 200, json: { items: [] } },
    })
    expect(await deleteGoogleCalendarEvent(config, "gone12345")).toBe(false)
    expect(await deleteGoogleCalendarEvent(config, "deleted123")).toBe(false)
    expect(await deleteGoogleCalendarEvent(config, "missing@example.com")).toBe(false)
    expect(await deleteGoogleCalendarEvent(config, "not an id")).toBe(false)
    expect(calls.some(call => call.method === "DELETE" && call.url.includes("not"))).toBe(false)
  })

  it("maps Google refusals to messages for the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fakeGoogle({ [`DELETE ${eventsUrl}/abc123def`]: { status: 403, json: { error: { message: "Forbidden" } } } })
    await expect(deleteGoogleCalendarEvent(config, "abc123def")).rejects.toThrow("make changes to events")
    expect(console.error).toHaveBeenCalledWith("Google Calendar delete failed (403): Forbidden")
  })
})
