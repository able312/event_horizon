import { ConvexError, v } from "convex/values"

import { effectiveUserName, validatePreferredName } from "../src/lib/users/userName"
import { companyMutation, companyQuery, requireCompanyUser } from "./lib/auth"
import { requireDocument, toRecord } from "./lib/records"
import { findUser } from "./lib/users"
import { nullable } from "./lib/validators"

/** The signed-in user's record, or null until `store` has run for this account. */
export const current = companyQuery({ args: {}, handler: async (ctx) => {
  const identity = await requireCompanyUser(ctx)
  const user = await findUser(ctx, identity.subject)
  return user ? toRecord(user) : null
} })

/** Called by the client after sign-in; creates or refreshes the user's record (companyMutation does the work). */
export const store = companyMutation({ args: {}, handler: (ctx) => ctx.userId })

/**
 * Sets the name the signed-in user shows under. Null, blank, or their Google
 * name clears it, so they follow their Google account name again. Only the
 * caller's own record can change; email comes from Google and isn't editable.
 */
export const updateName = companyMutation({
  args: { name: nullable(v.string()) },
  handler: async (ctx, { name }) => {
    const user = await requireDocument(ctx, "users", ctx.userId)
    const result = validatePreferredName(name, user.name)
    if (!result.ok) throw new ConvexError({ code: "InvalidInput", message: result.error })
    await ctx.db.patch("users", user._id, {
      preferredName: result.preferredName ?? undefined,
      updatedAt: new Date().toISOString(),
    })
    return toRecord(await requireDocument(ctx, "users", user._id))
  },
})

/** Every company account's name and email, for showing who created or last edited a record. */
export const list = companyQuery({ args: {}, handler: async (ctx) => {
  const users = await ctx.db.query("users").collect()
  return users.map((user) => ({ id: user._id, name: effectiveUserName(user), email: user.email }))
} })
