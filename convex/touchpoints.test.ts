import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { UNDATED_EVENT_TOUCHPOINT_TITLE } from "../src/lib/touchpoints/undatedEventTouchpoint"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")
const setup = () => convexTest(schema, modules).withIdentity(companyIdentity)
const timeZone = "America/Toronto"
const dated = { startDateTime: "2026-12-05T18:00:00.000Z", endDateTime: "2026-12-05T22:00:00.000Z" }
// 9pm Oct 31 in Toronto, already Nov 1 in UTC: due dates count from the Toronto date.
const NOW = "2026-11-01T01:00:00.000Z"
const DUE_IN_A_WEEK = "2026-11-07T00:00:00.000Z"

const touchpointsFor = (t: ReturnType<typeof setup>, eventId: Id<"events">) =>
  t.query(api.touchpoints.getByEventId, { eventId })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})
afterEach(() => vi.useRealTimers())

describe("undated event reminder touchpoint", () => {
  it("is added when an event is created without a date, due a week out in the sender's zone", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { title: "Lead" }, timeZone })
    expect(await touchpointsFor(t, event.id)).toMatchObject([
      { title: UNDATED_EVENT_TOUCHPOINT_TITLE, dueDate: DUE_IN_A_WEEK, completedAt: null, createdBy: event.createdBy },
    ])
  })

  it("falls back to the UTC date for senders that don't send a zone", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { title: "Lead" } })
    expect((await touchpointsFor(t, event.id))[0]?.dueDate).toBe("2026-11-08T00:00:00.000Z")
  })

  it("isn't added for dated or lost events", async () => {
    const t = setup()
    const withDate = await t.mutation(api.events.create, { input: { title: "Dated", ...dated }, timeZone })
    const lost = await t.mutation(api.events.create, { input: { title: "Lost", status: "lost" }, timeZone })
    expect(await touchpointsFor(t, withDate.id)).toEqual([])
    expect(await touchpointsFor(t, lost.id)).toEqual([])
  })

  it("is added when the date is removed, but not by other edits or by adding a date", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { title: "Party", ...dated }, timeZone })
    await t.mutation(api.events.update, { id: event.id, updates: { startDateTime: null, endDateTime: null }, timeZone })
    expect(await touchpointsFor(t, event.id)).toMatchObject([{ title: UNDATED_EVENT_TOUCHPOINT_TITLE, dueDate: DUE_IN_A_WEEK }])
    await t.mutation(api.events.update, { id: event.id, updates: { title: "Renamed" }, timeZone })
    await t.mutation(api.events.update, { id: event.id, updates: dated, timeZone })
    expect(await touchpointsFor(t, event.id)).toHaveLength(1)
  })

  it("isn't added when the date is removed while marking the event lost", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { title: "Party", ...dated }, timeZone })
    await t.mutation(api.events.update, { id: event.id, updates: { startDateTime: null, endDateTime: null, status: "lost" }, timeZone })
    expect(await touchpointsFor(t, event.id)).toEqual([])
  })

  it("is added by googleCalendar.updateEvent, which date removals go through", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { title: "Party", ...dated }, timeZone })
    await t.action(api.googleCalendar.updateEvent, { id: event.id, updates: { startDateTime: null, endDateTime: null }, timeZone })
    expect((await touchpointsFor(t, event.id))[0]?.dueDate).toBe(DUE_IN_A_WEEK)
  })
})

describe("touchpoints.backfillUndatedEvents", () => {
  it("adds the reminder to undated events nothing reminds the team about, once", async () => {
    const t = setup()
    const bare = await t.mutation(api.events.create, { input: { title: "Bare", ...dated } })
    const onlyCompleted = await t.mutation(api.events.create, { input: { title: "Done", ...dated } })
    const undatedTask = await t.mutation(api.events.create, { input: { title: "Undated task", ...dated } })
    const reminded = await t.mutation(api.events.create, { input: { title: "Reminded", ...dated } })
    const lost = await t.mutation(api.events.create, { input: { title: "Lost", ...dated } })
    const stillDated = await t.mutation(api.events.create, { input: { title: "Dated", ...dated } })
    await t.mutation(api.touchpoints.create, { eventId: onlyCompleted.id, values: { title: "Called", dueDate: "2026-10-01T00:00:00.000Z", completedAt: "2026-10-01T12:00:00.000Z" } })
    await t.mutation(api.touchpoints.create, { eventId: undatedTask.id, values: { title: "Someday" } })
    await t.mutation(api.touchpoints.create, { eventId: reminded.id, values: { title: "Follow up", dueDate: "2026-11-20T00:00:00.000Z" } })
    // Events from before the reminder existed: undated with no reminder.
    await t.run(async ctx => {
      for (const event of [bare, onlyCompleted, undatedTask, reminded]) await ctx.db.patch("events", event.id, { startDateTime: null, endDateTime: null })
      await ctx.db.patch("events", lost.id, { startDateTime: null, endDateTime: null, status: "lost" })
    })

    expect(await t.mutation(internal.touchpoints.backfillUndatedEvents, { timeZone })).toEqual({ added: 3, skipped: 1 })
    for (const event of [bare, onlyCompleted, undatedTask]) {
      expect((await touchpointsFor(t, event.id)).filter(tp => tp.title === UNDATED_EVENT_TOUCHPOINT_TITLE)).toMatchObject([{ dueDate: DUE_IN_A_WEEK, completedAt: null }])
    }
    expect(await touchpointsFor(t, reminded.id)).toHaveLength(1)
    expect(await touchpointsFor(t, lost.id)).toEqual([])
    expect(await touchpointsFor(t, stillDated.id)).toEqual([])

    expect(await t.mutation(internal.touchpoints.backfillUndatedEvents, { timeZone })).toEqual({ added: 0, skipped: 4 })
  })
})
