import { companyMutation, companyQuery, requireCompanyUser } from "./lib/auth"
import { toRecord } from "./lib/records"
import { findUser } from "./lib/users"

/** The signed-in user's record, or null until `store` has run for this account. */
export const current = companyQuery({ args: {}, handler: async (ctx) => {
  const identity = await requireCompanyUser(ctx)
  const user = await findUser(ctx, identity.subject)
  return user ? toRecord(user) : null
} })

/** Called by the client after sign-in; creates or refreshes the user's record (companyMutation does the work). */
export const store = companyMutation({ args: {}, handler: (ctx) => ctx.userId })

/** Every company account's name and email, for showing who created or last edited a record. */
export const list = companyQuery({ args: {}, handler: async (ctx) => {
  const users = await ctx.db.query("users").collect()
  return users.map((user) => ({ id: user._id, name: user.name, email: user.email }))
} })
