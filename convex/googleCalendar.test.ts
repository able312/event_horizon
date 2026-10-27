import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "./_generated/api"
import { googleEventIdFor } from "./lib/googleCalendar"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"
const modules = import.meta.glob("./**/*.{ts,js}")
const setup = () => convexTest(schema, modules).withIdentity(companyIdentity)

const dated = { title: "Dinner", startDateTime: "2026-05-12T18:30:00.000Z", endDateTime: "2026-05-12T21:00:00.000Z" }
type Sent = { method: string; url: string; body: Record<string, unknown> | null }

function fakeGoogle() {
  const sent: Sent[] = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    if (url.startsWith("https://oauth2.googleapis.com/")) return Response.json({ access_token: "token" })
    const method = init.method ?? "GET"
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null
    sent.push({ method, url, body })
    const id = method === "POST" ? String(body?.id) : decodeURIComponent(url.split("/").pop()!)
    return Response.json({ id, iCalUID: `${id}@google.com`, htmlLink: `https://www.google.com/calendar/event?eid=${id}` })
  }))
  return sent
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client")
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "secret")
  vi.stubEnv("GOOGLE_CALENDAR_REFRESH_TOKEN", "refresh")
  vi.stubEnv("GOOGLE_CALENDAR_ID", "venue@group.calendar.google.com")
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("googleCalendar.pushEvent", () => {
  it("creates the Google event, links it, then updates that event", async () => {
    const t = setup()
    const sent = fakeGoogle()
    const event = await t.mutation(api.events.create, { input: dated, client: { newContact: { firstName: "Ada", email: "ada@example.com" } } })
    await t.mutation(api.touchpoints.create, { eventId: event.id, values: { title: "Final guest count", dueDate: "2026-05-01T00:00:00.000Z" } })

    const googleId = googleEventIdFor(event.id)
    expect(await t.action(api.googleCalendar.pushEvent, { eventId: event.id })).toEqual({ eventUrl: `https://calendar.google.com/calendar/event?eid=${googleId}` })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ method: "POST", body: { id: googleId, summary: "Dinner", start: { dateTime: dated.startDateTime }, end: { dateTime: dated.endDateTime } } })
    expect(sent[0]!.body?.description).toContain("Name: Ada")
    expect(sent[0]!.body?.description).toContain("Final guest count")
    const linked = await t.query(api.events.getById, { id: event.id })
    expect(linked.calendarId).toBe(`${googleId}@google.com`)
    expect(linked.updatedBy).toBeDefined()

    await t.mutation(api.events.update, { id: event.id, updates: { title: "Renamed dinner" } })
    await t.action(api.googleCalendar.pushEvent, { eventId: event.id })
    expect(sent[1]).toMatchObject({ method: "PATCH", body: { summary: "Renamed dinner", status: "confirmed" } })
    expect(sent[1]!.url.endsWith(`/events/${googleId}`)).toBe(true)
  })

  it("refuses events without dates, before contacting Google", async () => {
    const t = setup()
    const sent = fakeGoogle()
    const event = await t.mutation(api.events.create, { input: { title: "Undated" } })
    await expect(t.action(api.googleCalendar.pushEvent, { eventId: event.id })).rejects.toThrow("Set both start and end")
    expect(sent).toEqual([])
  })

  it("refuses when the deployment isn't configured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubEnv("GOOGLE_CALENDAR_REFRESH_TOKEN", undefined)
    const t = setup()
    const event = await t.mutation(api.events.create, { input: dated })
    await expect(t.action(api.googleCalendar.pushEvent, { eventId: event.id })).rejects.toThrow("isn't set up")
  })

  it("requires a signed-in company account", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: dated })
    await expect(convexTest(schema, modules).action(api.googleCalendar.pushEvent, { eventId: event.id })).rejects.toThrow("Sign in")
    await expect(t.withIdentity({ ...companyIdentity, email: "someone@gmail.com" }).action(api.googleCalendar.pushEvent, { eventId: event.id })).rejects.toThrow("Only @westlinks.ca")
  })
})
