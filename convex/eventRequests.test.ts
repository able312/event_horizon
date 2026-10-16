import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "./_generated/api"
import { QUESTIONS } from "./lib/eventRequestPayload"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")
const SECRET = "test-secret-value"
const newTest = () => convexTest(schema, modules)

const body = (responseId = "resp-1", submittedAt = "2026-10-16T14:00:00.000Z") => ({
  responseId, submittedAt, respondentEmail: "ada@example.com",
  answers: {
    [QUESTIONS.firstName]: "Ada", [QUESTIONS.lastName]: "Lovelace", [QUESTIONS.phone]: "519-555-0100",
    [QUESTIONS.eventType]: "Wedding", [QUESTIONS.preferredDate]: "2027-06-12", [QUESTIONS.guestCount]: "120",
  },
})
function post(t: ReturnType<typeof newTest>, payload: unknown, secret: string | null = SECRET) {
  return t.fetch("/event-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret === null ? {} : { Authorization: `Bearer ${secret}` }) },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  })
}
async function submit(t: ReturnType<typeof newTest>, responseId?: string, submittedAt?: string) {
  const response = await post(t, body(responseId, submittedAt))
  expect(response.status).toBe(200)
}

afterEach(() => { vi.unstubAllEnvs() })

describe("POST /event-requests", () => {
  it("refuses every request when no secret is configured", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", undefined)
    expect((await post(newTest(), body())).status).toBe(503)
  })

  it("rejects a missing or wrong secret without storing anything", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    expect((await post(t, body(), null)).status).toBe(401)
    expect((await post(t, body(), "wrong")).status).toBe(401)
    expect(await t.run(ctx => ctx.db.query("eventRequests").collect())).toHaveLength(0)
  })

  it("rejects bad JSON, oversized bodies and invalid answers with the reasons", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    expect((await post(t, "{not json")).status).toBe(400)
    expect((await post(t, { ...body(), padding: "x".repeat(40_000) })).status).toBe(413)
    const invalid = await post(t, { ...body(), respondentEmail: "nope" })
    expect(invalid.status).toBe(422)
    expect(await invalid.json()).toEqual({ error: "Invalid event request", problems: ["respondentEmail is not a valid email address"] })
    expect(await t.run(ctx => ctx.db.query("eventRequests").collect())).toHaveLength(0)
  })

  it("stores a pending request once, even when Apps Script resends it", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    const first = await post(t, body())
    expect(first.status).toBe(200)
    const created = await first.json() as { status: string; id: string }
    expect(created.status).toBe("created")
    const again = await post(t, body())
    expect(await again.json()).toEqual({ status: "duplicate", id: created.id })

    const [request] = await t.withIdentity(companyIdentity).query(api.eventRequests.listPending, {})
    expect(request).toMatchObject({
      id: created.id, responseId: "resp-1", firstName: "Ada", eventType: "wedding", guestCount: 120,
      status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
    })
    expect(Date.parse(request!.receivedAt)).not.toBeNaN()
  })
})

const ADA = { newContact: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" } }

describe("Convex eventRequests", () => {
  it("requires a company account to list or review requests", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const [request] = await t.run(ctx => ctx.db.query("eventRequests").collect())
    await expect(t.query(api.eventRequests.listPending, {})).rejects.toMatchObject({ data: { code: "Unauthenticated" } })
    await expect(t.mutation(api.eventRequests.dismiss, { id: request!._id })).rejects.toMatchObject({ data: { code: "Unauthenticated" } })
    await expect(t.mutation(api.eventRequests.accept, { id: request!._id, input: {}, client: ADA })).rejects.toMatchObject({ data: { code: "Unauthenticated" } })
  })

  it("lists only pending requests, newest first", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t, "older", "2026-10-01T10:00:00.000Z")
    await submit(t, "newer", "2026-10-15T10:00:00.000Z")
    await submit(t, "dismissed", "2026-10-16T10:00:00.000Z")
    const staff = t.withIdentity(companyIdentity)
    const dismissed = (await staff.query(api.eventRequests.listPending, {}))[0]!
    await staff.mutation(api.eventRequests.dismiss, { id: dismissed.id })
    expect((await staff.query(api.eventRequests.listPending, {})).map(r => r.responseId)).toEqual(["newer", "older"])
  })

  it("dismisses once and records who reviewed it", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const staff = t.withIdentity(companyIdentity)
    const [request] = await staff.query(api.eventRequests.listPending, {})
    await staff.mutation(api.eventRequests.dismiss, { id: request!.id })
    const stored = await t.run(ctx => ctx.db.get("eventRequests", request!.id))
    expect(stored).toMatchObject({ status: "dismissed", eventId: null })
    expect(stored!.reviewedBy).not.toBeNull()
    await expect(staff.mutation(api.eventRequests.dismiss, { id: request!.id })).rejects.toMatchObject({ data: { code: "AlreadyReviewed" } })
    await expect(staff.mutation(api.eventRequests.accept, { id: request!.id, input: {}, client: ADA })).rejects.toMatchObject({ data: { code: "AlreadyReviewed" } })
  })

  it("restores a dismissed request to the Inbox, but nothing else", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const staff = t.withIdentity(companyIdentity)
    const [request] = await staff.query(api.eventRequests.listPending, {})
    await expect(staff.mutation(api.eventRequests.restore, { id: request!.id })).rejects.toMatchObject({ data: { code: "NotDismissed" } })
    await staff.mutation(api.eventRequests.dismiss, { id: request!.id })
    await staff.mutation(api.eventRequests.restore, { id: request!.id })
    expect(await t.run(ctx => ctx.db.get("eventRequests", request!.id))).toMatchObject({ status: "pending", reviewedBy: null, reviewedAt: null })
    expect((await staff.query(api.eventRequests.listPending, {})).map(r => r.id)).toEqual([request!.id])
    await expect(t.mutation(api.eventRequests.restore, { id: request!.id })).rejects.toMatchObject({ data: { code: "Unauthenticated" } })
  })

  it("accepts into an event with its primary client in one step", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const staff = t.withIdentity(companyIdentity)
    const [request] = await staff.query(api.eventRequests.listPending, {})
    const event = await staff.mutation(api.eventRequests.accept, {
      id: request!.id,
      input: { title: "Lovelace Wedding", type: "wedding", startDateTime: "2027-06-12T20:30:00.000Z", status: "tentative", maxGuests: 120 },
      client: { newContact: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "519-555-0100" } },
    })
    expect(event).toMatchObject({ title: "Lovelace Wedding", status: "tentative", maxGuests: 120 })
    expect((await staff.query(api.eventContacts.getPrimaryClients, { eventIds: [event.id] }))[event.id]?.displayName).toBe("Ada Lovelace")
    const stored = await t.run(ctx => ctx.db.get("eventRequests", request!.id))
    expect(stored).toMatchObject({ status: "accepted", eventId: event.id })
    expect(stored!.reviewedBy).toBe(event.createdBy)
    expect(await staff.query(api.eventRequests.listPending, {})).toHaveLength(0)
    await expect(staff.mutation(api.eventRequests.accept, { id: request!.id, input: {}, client: ADA })).rejects.toMatchObject({ data: { code: "AlreadyReviewed" } })
  })

  it("refuses to accept without a primary client", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const staff = t.withIdentity(companyIdentity)
    const [request] = await staff.query(api.eventRequests.listPending, {})
    // @ts-expect-error client is required
    await expect(staff.mutation(api.eventRequests.accept, { id: request!.id, input: {} })).rejects.toThrow()
    // @ts-expect-error client can't be null
    await expect(staff.mutation(api.eventRequests.accept, { id: request!.id, input: {}, client: null })).rejects.toThrow()
    expect(await staff.query(api.eventRequests.listPending, {})).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query("events").collect())).toHaveLength(0)
  })

  it("leaves the request pending and creates nothing when the client's email is taken", async () => {
    vi.stubEnv("EVENT_REQUEST_SECRET", SECRET)
    const t = newTest()
    await submit(t)
    const staff = t.withIdentity(companyIdentity)
    const existing = await staff.mutation(api.contacts.create, { input: { displayName: "Ada L", email: "ada@example.com" } })
    const [request] = await staff.query(api.eventRequests.listPending, {})
    await expect(staff.mutation(api.eventRequests.accept, {
      id: request!.id, input: { title: "Wedding" }, client: { newContact: { firstName: "Ada", email: "ADA@example.com" } },
    })).rejects.toMatchObject({ data: { code: "EmailTaken", existingContactId: existing.id } })
    expect(await staff.query(api.eventRequests.listPending, {})).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query("events").collect())).toHaveLength(0)

    // Picking the existing contact instead works
    const event = await staff.mutation(api.eventRequests.accept, { id: request!.id, input: { title: "Wedding" }, client: { contactId: existing.id } })
    expect((await staff.query(api.eventContacts.getPrimaryClients, { eventIds: [event.id] }))[event.id]?.contactId).toBe(existing.id)
  })
})
