import { ConvexError, type PropertyValidators, type ObjectType } from "convex/values"
import type { UserIdentity } from "convex/server"

import type { Id } from "../_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server"
import { auditedWriter } from "./audit"
import { upsertUser } from "./users"

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

/** A mutation context whose database stamps the caller as creator/last editor (lib/audit.ts). */
export type CompanyMutationCtx = MutationCtx & { userId: Id<"users"> }

declare const process: { env: Record<string, string | undefined> }

/**
 * A public mutation that requires a company identity before its handler runs. The
 * caller's user record is created if `users.store` hasn't run yet, so every write
 * can be attributed.
 *
 * While the CLI is importing (or clearing) legacy data, EVENT_HORIZON_LEGACY_IMPORT
 * is set and business writes are refused, so the import can't delete or interleave
 * with an edit. `allowDuringImport` is for writes that only touch users.
 */
export function companyMutation<Args extends PropertyValidators, Returns>(definition: {
  args: Args
  allowDuringImport?: boolean
  handler: (ctx: CompanyMutationCtx, args: ObjectType<Args>) => Returns | Promise<Returns>
}) {
  return mutation({
    args: definition.args,
    handler: async (ctx, args: ObjectType<Args>): Promise<Returns> => {
      const identity = await requireCompanyUser(ctx)
      if (!definition.allowDuringImport && process.env.EVENT_HORIZON_LEGACY_IMPORT === "enabled") {
        throw new ConvexError({ code: "ImportInProgress", message: "A data import is in progress. Try again in a few minutes." })
      }
      const userId = await upsertUser(ctx, identity)
      return definition.handler({ ...ctx, db: auditedWriter(ctx.db, userId), userId }, args)
    },
  })
}
