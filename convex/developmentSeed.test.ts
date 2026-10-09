import { convexTest } from "convex-test"
import { afterEach, expect, it, vi } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")
afterEach(() => vi.unstubAllEnvs())
it("refuses to seed deployments that haven't explicitly enabled local sample data", async () => {
  vi.stubEnv("EVENT_HORIZON_LOCAL_SEED", undefined)
  const t = convexTest(schema, modules)
  await expect(t.mutation(internal.developmentSeed.seed, {})).rejects.toThrow("seeding is disabled")
  expect(await t.run((ctx) => ctx.db.query("events").collect())).toEqual([])
})
it("seeds linked synthetic data once and preserves edits on repeated setup", async () => {
  vi.stubEnv("EVENT_HORIZON_LOCAL_SEED", "enabled")
  const t = convexTest(schema, modules)
  expect(await t.mutation(internal.developmentSeed.seed, {})).toEqual({ seeded: true })
  await t.run(async (ctx) => {
    const events = await ctx.db.query("events").collect()
    expect(events).toHaveLength(2)
    expect(await ctx.db.query("contacts").collect()).toHaveLength(65)
    const roles = await ctx.db.query("contactRoles").collect()
    expect(roles).toHaveLength(65)
    expect(await ctx.db.get("contacts", roles[0].contactId)).not.toBeNull()
    await ctx.db.patch("events", events[0]._id, { title: "User edit" })
  })
  expect(await t.mutation(internal.developmentSeed.seed, {})).toEqual({ seeded: false })
  expect((await t.run((ctx) => ctx.db.query("events").collect())).some((event) => event.title === "User edit")).toBe(true)
})
