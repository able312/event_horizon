import { companyMutation, companyQuery, requireCompanyUser, type CompanyIdentity } from "./lib/auth"
import type { QueryCtx } from "./_generated/server"
import { toRecord } from "./lib/records"

function displayName(identity: CompanyIdentity): string | null {
  const name = identity.name ?? [identity.givenName, identity.familyName].filter(Boolean).join(" ")
  return name.trim() || null
}

async function findUser(ctx: Pick<QueryCtx, "db">, workosUserId: string) {
  return ctx.db.query("users").withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId)).unique()
}

/** The signed-in user's record, or null until `store` has run for this account. */
export const current = companyQuery({ args: {}, handler: async (ctx) => {
  const identity = await requireCompanyUser(ctx)
  const user = await findUser(ctx, identity.subject)
  return user ? toRecord(user) : null
} })

/** Called by the client after sign-in; creates or refreshes the user's record. */
export const store = companyMutation({ args: {}, handler: async (ctx) => {
  const identity = await requireCompanyUser(ctx)
  const now = new Date().toISOString()
  const fields = { email: identity.email.trim().toLowerCase(), name: displayName(identity) }
  const existing = await findUser(ctx, identity.subject)
  if (existing) {
    if (existing.email !== fields.email || existing.name !== fields.name) {
      await ctx.db.patch("users", existing._id, { ...fields, updatedAt: now })
    }
    return existing._id
  }
  return ctx.db.insert("users", { workosUserId: identity.subject, ...fields, createdAt: now, updatedAt: now })
} })
