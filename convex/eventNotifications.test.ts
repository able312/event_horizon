import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")
const teammateIdentity = { ...companyIdentity, subject: "user_teammate", email: "teammate@westlinks.ca", name: "Tess Mate" }

/** `author` makes the changes; `reader` is the teammate who should hear about them. */
function setup() {
  const t = convexTest(schema, modules)
  return { t, author: t.withIdentity(teammateIdentity), reader: t.withIdentity(companyIdentity) }
}

const DATED = { startDateTime: "2027-06-12T22:00:00.000Z", endDateTime: "2027-06-13T03:00:00.000Z" }

/** Moves a notification's timestamps back, as if it was written `minutes` ago. */
async function age(t: ReturnType<typeof convexTest>, id: string, minutes: number) {
  const at = new Date(Date.now() - minutes * 60_000).toISOString()
  await t.run(ctx => ctx.db.patch("eventNotifications", id as Id<"eventNotifications">, { createdAt: at, updatedAt: at }))
}

describe("event notifications", () => {
  it("tells teammates about a new event, but not the person who added it", async () => {
    const { author, reader } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Smith Wedding", type: "wedding", status: "tentative", ...DATED } })

    const [notification, ...rest] = await reader.query(api.eventNotifications.listForInbox, {})
    expect(rest).toHaveLength(0)
    expect(notification).toMatchObject({
      kind: "created", eventId: event.id, eventTitle: "Smith Wedding", eventExists: true, actorName: "Tess Mate", read: false,
      changes: [
        { field: "title", from: null, to: "Smith Wedding" },
        { field: "startDateTime", from: null, to: DATED.startDateTime },
        { field: "endDateTime", from: null, to: DATED.endDateTime },
        { field: "type", from: null, to: "wedding" },
        { field: "status", from: null, to: "tentative" },
      ],
    })
    expect(await author.query(api.eventNotifications.listForInbox, {})).toEqual([])
  })

  it("notifies on name, date, type and status changes only", async () => {
    const { t, author, reader } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Gala", ...DATED } })
    const [created] = await reader.query(api.eventNotifications.listForInbox, {})
    await age(t, created!.id, 60)

    await author.mutation(api.events.update, { id: event.id, updates: { internalNotes: "Bring chairs", maxGuests: 80 } })
    expect(await reader.query(api.eventNotifications.listForInbox, {})).toHaveLength(1)

    await author.mutation(api.events.update, { id: event.id, updates: { title: "Spring Gala", status: "confirmed" } })
    const [updated] = await reader.query(api.eventNotifications.listForInbox, {})
    expect(updated).toMatchObject({
      kind: "updated", eventTitle: "Spring Gala",
      changes: [{ field: "title", from: "Gala", to: "Spring Gala" }, { field: "status", from: "new_lead", to: "confirmed" }],
    })
  })

  it("folds the author's quick follow-up edits into one notification", async () => {
    const { t, author, reader } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Gala" } })
    // Setting the date right after adding the event updates the "new event" notification
    await author.mutation(api.events.update, { id: event.id, updates: { ...DATED, status: "tentative" } })
    let list = await reader.query(api.eventNotifications.listForInbox, {})
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ kind: "created", changes: expect.arrayContaining([{ field: "status", from: null, to: "tentative" }]) })
    await age(t, list[0]!.id, 60)

    await author.mutation(api.events.update, { id: event.id, updates: { status: "confirmed" } })
    await author.mutation(api.events.update, { id: event.id, updates: { title: "Gala Night" } })
    list = await reader.query(api.eventNotifications.listForInbox, {})
    expect(list).toHaveLength(2)
    expect(list[0]!.changes).toEqual([
      { field: "title", from: "Gala", to: "Gala Night" },
      { field: "status", from: "tentative", to: "confirmed" },
    ])

    // Changing it all back leaves nothing to report
    await author.mutation(api.events.update, { id: event.id, updates: { title: "Gala", status: "tentative" } })
    expect(await reader.query(api.eventNotifications.listForInbox, {})).toHaveLength(1)
  })

  it("starts a new notification for another person's edit or after the merge window", async () => {
    const { t, author, reader } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Gala" } })
    await reader.mutation(api.events.update, { id: event.id, updates: { title: "Gala 2027" } })
    // The author hears about the teammate's edit; a user with no name shows by email
    expect(await author.query(api.eventNotifications.listForInbox, {})).toMatchObject([{ kind: "updated", actorName: "staff@westlinks.ca" }])

    const [created] = await reader.query(api.eventNotifications.listForInbox, {})
    await age(t, created!.id, 11)
    await author.mutation(api.events.update, { id: event.id, updates: { type: "tournament" } })
    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => n.kind)).toEqual(["updated", "created"])
  })

  it("replaces an event's notifications with one saying it was deleted", async () => {
    const { t, author, reader } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Gala", ...DATED, status: "confirmed" } })
    const [created] = await reader.query(api.eventNotifications.listForInbox, {})
    await age(t, created!.id, 60)
    await author.mutation(api.events.remove, { id: event.id })

    expect(await reader.query(api.eventNotifications.listForInbox, {})).toMatchObject([
      { kind: "deleted", eventTitle: "Gala", eventExists: false, changes: expect.arrayContaining([{ field: "status", from: null, to: "confirmed" }]) },
    ])
    expect(await t.run(ctx => ctx.db.query("eventNotifications").collect())).toHaveLength(1)
  })

  it("leaves nothing when the author deletes an event right after adding it", async () => {
    const { t, author } = setup()
    const event = await author.mutation(api.events.create, { input: { title: "Oops" } })
    await author.mutation(api.events.remove, { id: event.id })
    expect(await t.run(ctx => ctx.db.query("eventNotifications").collect())).toEqual([])
  })

  it("notifies when a website request is accepted", async () => {
    const { t, author, reader } = setup()
    const requestId = await t.run(ctx => ctx.db.insert("eventRequests", {
      responseId: "r1", submittedAt: "2026-10-16T14:00:00.000Z", receivedAt: "2026-10-16T14:00:01.000Z", eventName: null,
      firstName: "Ada", lastName: "Lovelace", organizationName: null, email: "ada@example.com", phone: "519-555-0100",
      eventType: "wedding", preferredDate: null, alternateDate: null, startTime: null, guestCount: 80, details: null,
      referralSource: null, extraAnswers: [], status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
    }))
    await author.mutation(api.eventRequests.accept, { id: requestId, input: { title: "Lovelace Wedding", type: "wedding" }, client: { newContact: { firstName: "Ada", email: "ada@example.com" } } })
    expect(await reader.query(api.eventNotifications.listForInbox, {})).toMatchObject([{ kind: "created", eventTitle: "Lovelace Wedding" }])
  })

  it("keeps read and dismissed per user, and shows updated content as unread again", async () => {
    const { t, author, reader } = setup()
    const third = t.withIdentity({ ...companyIdentity, subject: "user_third", email: "third@westlinks.ca" })
    const first = await author.mutation(api.events.create, { input: { title: "First" } })
    await author.mutation(api.events.create, { input: { title: "Second" } })
    const [second, firstNotification] = await reader.query(api.eventNotifications.listForInbox, {})

    await reader.mutation(api.eventNotifications.markRead, { id: firstNotification!.id })
    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => n.read)).toEqual([false, true])
    expect((await third.query(api.eventNotifications.listForInbox, {})).map(n => n.read)).toEqual([false, false])

    await reader.mutation(api.eventNotifications.dismiss, { id: second!.id })
    // Opening it while Undo is offered doesn't bring it back
    await reader.mutation(api.eventNotifications.markRead, { id: second!.id })
    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => n.eventTitle)).toEqual(["First"])
    await reader.mutation(api.eventNotifications.restore, { id: second!.id })
    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => [n.eventTitle, n.read])).toEqual([["Second", true], ["First", true]])

    // The author changes the first event again within the window: it's news again
    await author.mutation(api.events.update, { id: first.id, updates: { title: "First (moved)" } })
    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => [n.eventTitle, n.read])).toEqual([["First (moved)", false], ["Second", true]])

    await third.mutation(api.eventNotifications.markAllRead, {})
    expect((await third.query(api.eventNotifications.listForInbox, {})).every(n => n.read)).toBe(true)
    expect((await reader.query(api.eventNotifications.listForInbox, {}))[0]!.read).toBe(false)
  })

  it("prunes notifications past the retention window, with their receipts", async () => {
    const { t, author, reader } = setup()
    await author.mutation(api.events.create, { input: { title: "Old" } })
    await author.mutation(api.events.create, { input: { title: "New" } })
    const [, old] = await reader.query(api.eventNotifications.listForInbox, {})
    await reader.mutation(api.eventNotifications.markRead, { id: old!.id })
    await age(t, old!.id, 31 * 24 * 60)

    expect((await reader.query(api.eventNotifications.listForInbox, {})).map(n => n.eventTitle)).toEqual(["New"])
    expect(await t.mutation(internal.eventNotifications.pruneOld, {})).toBe(1)
    expect(await t.run(ctx => ctx.db.query("eventNotifications").collect())).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query("eventNotificationReceipts").collect())).toEqual([])
  })

  it("still shows older teammate updates behind many hidden notifications", async () => {
    const { t, author, reader } = setup()
    await author.mutation(api.events.create, { input: { title: "Older teammate event" } })
    const [older] = await reader.query(api.eventNotifications.listForInbox, {})
    await age(t, older!.id, 60)
    // 250 newer notifications the reader never sees: their own changes and ones they dismissed
    const eventId = older!.eventId
    await t.run(async ctx => {
      const at = new Date().toISOString()
      const userId = async (workosUserId: string, email: string) =>
        (await ctx.db.query("users").withIndex("by_workosUserId", q => q.eq("workosUserId", workosUserId)).unique())?._id
          ?? await ctx.db.insert("users", { workosUserId, email, name: null, createdAt: at, updatedAt: at })
      const readerId = await userId(companyIdentity.subject, companyIdentity.email)
      const authorId = await userId(teammateIdentity.subject, teammateIdentity.email)
      for (let i = 0; i < 250; i++) {
        const own = i % 2 === 0
        const id = await ctx.db.insert("eventNotifications", {
          kind: "updated", eventId, eventTitle: `Hidden ${i}`, changes: [], actorId: own ? readerId : authorId, createdAt: at, updatedAt: at,
        })
        if (!own) await ctx.db.insert("eventNotificationReceipts", { notificationId: id, userId: readerId, state: "dismissed" })
      }
    })

    const inbox = await reader.query(api.eventNotifications.listForInbox, {})
    expect(inbox.map(n => n.eventTitle)).toEqual(["Older teammate event"])
    expect(inbox[0]!.read).toBe(false)
    // Mark all read reaches it too
    await reader.mutation(api.eventNotifications.markAllRead, {})
    expect((await reader.query(api.eventNotifications.listForInbox, {}))[0]!.read).toBe(true)
  })

  it("requires a company account", async () => {
    const { t } = setup()
    await expect(t.query(api.eventNotifications.listForInbox, {})).rejects.toThrow("Sign in")
  })
})
