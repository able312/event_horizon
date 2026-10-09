import { ConvexError, type PropertyValidators, type ObjectType } from "convex/values"
import type { UserIdentity } from "convex/server"

import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server"

/** Only Google Workspace accounts on this exact domain may use the app. */
export const COMPANY_EMAIL_DOMAIN = "westlinks.ca"

export type AuthErrorCode = "Unauthenticated" | "Forbidden"

export type CompanyIdentity = UserIdentity & { email: string }

export function isCompanyEmail(email: string | undefined): email is string {
  if (!email) return false
  const at = email.lastIndexOf("@")
  if (at <= 0) return false
  return email.slice(at + 1).trim().toLowerCase() === COMPANY_EMAIL_DOMAIN
}

/**
 * Every public function calls this before touching data. The auth provider's own
 * settings are not trusted: the email claim (added by the WorkOS JWT template)
 * must be on the company domain.
 */
export async function requireCompanyUser(ctx: Pick<QueryCtx, "auth">): Promise<CompanyIdentity> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({ code: "Unauthenticated" satisfies AuthErrorCode, message: "Sign in to continue" })
  }
  if (!isCompanyEmail(identity.email)) {
    throw new ConvexError({ code: "Forbidden" satisfies AuthErrorCode, message: `Only @${COMPANY_EMAIL_DOMAIN} accounts can use Event Horizon` })
  }
  return { ...identity, email: identity.email }
}

/** A public query that requires a company identity before its handler runs. */
export function companyQuery<Args extends PropertyValidators, Returns>(definition: {
  args: Args
  handler: (ctx: QueryCtx, args: ObjectType<Args>) => Returns | Promise<Returns>
}) {
  return query({
    args: definition.args,
    handler: async (ctx, args: ObjectType<Args>): Promise<Returns> => {
      await requireCompanyUser(ctx)
      return definition.handler(ctx, args)
    },
  })
}

/** A public mutation that requires a company identity before its handler runs. */
export function companyMutation<Args extends PropertyValidators, Returns>(definition: {
  args: Args
  handler: (ctx: MutationCtx, args: ObjectType<Args>) => Returns | Promise<Returns>
}) {
  return mutation({
    args: definition.args,
    handler: async (ctx, args: ObjectType<Args>): Promise<Returns> => {
      await requireCompanyUser(ctx)
      return definition.handler(ctx, args)
    },
  })
}
