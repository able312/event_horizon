import type { CurrentUser } from "~/definitions/database"
import { effectiveUserName, validatePreferredName, type UserNameValidation } from "~/lib/users/userName"

/** What the name field starts with: the name the team currently sees. */
export function initialNameDraft(user: CurrentUser): string {
  return effectiveUserName(user) ?? ""
}

/** Validates the draft and says whether saving it would change anything. */
export function evaluateNameDraft(draft: string, user: CurrentUser): UserNameValidation & { changed: boolean } {
  const result = validatePreferredName(draft, user.name)
  if (!result.ok) return { ...result, changed: true }
  return { ...result, changed: result.preferredName !== (user.preferredName ?? null) }
}
