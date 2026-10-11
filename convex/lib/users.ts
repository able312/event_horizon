import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { CompanyIdentity } from "./auth"

function displayName(identity: CompanyIdentity): string | null {
  const name = identity.name ?? [identity.givenName, identity.familyName].filter(Boolean).join(" ")
  return name.trim() || null
}

export async function findUser(ctx: Pick<QueryCtx, "db">, workosUserId: string) {
  return ctx.db.query("users").withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId)).unique()
}

/** Creates or refreshes the signed-in account's user record and returns its ID. */
export async function upsertUser(ctx: Pick<MutationCtx, "db">, identity: CompanyIdentity): Promise<Id<"users">> {
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
}
