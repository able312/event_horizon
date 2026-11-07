import { v } from "convex/values"

import type { QueryCtx } from "./_generated/server"
import { companyMutation, companyQuery } from "./lib/auth"
import { requireDocument, toRecord } from "./lib/records"
import { nullable } from "./lib/validators"

// Venue-wide settings live in a single row. Reads never write: before anyone saves
// a setting there is no row, and `get` returns null.
// Public functions; every handler requires a company identity (lib/auth.ts).

function findSettings(ctx: Pick<QueryCtx, "db">) {
  return ctx.db.query("venueSettings").first()
}

export const get = companyQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await findSettings(ctx)
    return doc ? toRecord(doc) : null
  },
})

// The read and the insert share one transaction, and Convex retries competing
// writes, so two first saves cannot create a second row.
export const setDefaultEstimateTerms = companyMutation({
  args: { terms: nullable(v.string()) },
  handler: async (ctx, { terms }) => {
    const existing = await findSettings(ctx)
    if (existing) {
      await ctx.db.patch("venueSettings", existing._id, { defaultEstimateTerms: terms, updatedAt: new Date().toISOString() })
      return toRecord(await requireDocument(ctx, "venueSettings", existing._id))
    }
    const id = await ctx.db.insert("venueSettings", {
      defaultEstimateTerms: terms,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    return toRecord(await requireDocument(ctx, "venueSettings", id))
  },
})
