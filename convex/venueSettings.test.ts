import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

function setup() {
  const t = convexTest(schema, modules).withIdentity(companyIdentity)
  const rows = () => t.run((ctx) => ctx.db.query("venueSettings").collect())
  return { t, rows }
}

describe("venue settings", () => {
  it("returns null before anything is saved, without writing", async () => {
    const { t, rows } = setup()
    expect(await t.query(api.venueSettings.get, {})).toBeNull()
    expect(await rows()).toEqual([])
  })

  it("creates the single settings row on first save, then updates it in place", async () => {
    const { t, rows } = setup()
    const created = await t.mutation(api.venueSettings.setDefaultEstimateTerms, { terms: "Net 30" })
    expect(created).toMatchObject({ defaultEstimateTerms: "Net 30", createdAt: expect.any(String), updatedAt: null })
    expect(await t.query(api.venueSettings.get, {})).toEqual(created)

    const updated = await t.mutation(api.venueSettings.setDefaultEstimateTerms, { terms: "Due on receipt" })
    expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, defaultEstimateTerms: "Due on receipt", updatedAt: expect.any(String) })
    const cleared = await t.mutation(api.venueSettings.setDefaultEstimateTerms, { terms: null })
    expect(cleared).toMatchObject({ id: created.id, defaultEstimateTerms: null })
    expect(await t.query(api.venueSettings.get, {})).toEqual(cleared)
    expect(await rows()).toHaveLength(1)
  })
})
