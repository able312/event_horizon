// The name a teammate shows under. Google sign-in supplies an account name that
// refreshes on every sign-in; a user can set their own name in Settings, which
// takes precedence and survives sign-ins. Shared by Convex and the renderer.

export const USER_NAME_MAX_LENGTH = 80

export type UserNameFields = {
  /** The name from the Google account, refreshed on each sign-in. */
  name: string | null
  /** The name the user set in Settings; absent means "use the Google name". */
  preferredName?: string | null
}

export type UserNameValidation =
  | { ok: true; preferredName: string | null }
  | { ok: false; error: string }

/** Trims and collapses inner whitespace; an empty result means "no name". */
export function normalizeUserName(input: string): string | null {
  const name = input.trim().replace(/\s+/g, " ")
  return name === "" ? null : name
}

/**
 * Checks a name typed in Settings. A blank name, or one matching the Google
 * account name, clears the user's own name so they follow their Google name again.
 */
export function validatePreferredName(input: string | null, googleName: string | null): UserNameValidation {
  const name = input === null ? null : normalizeUserName(input)
  if (name !== null && name.length > USER_NAME_MAX_LENGTH) {
    return { ok: false, error: `Use ${USER_NAME_MAX_LENGTH} characters or fewer` }
  }
  if (name === null || name === normalizeUserName(googleName ?? "")) return { ok: true, preferredName: null }
  return { ok: true, preferredName: name }
}

/** The name to show for a user: their own name, else their Google name, else null. */
export function effectiveUserName(user: UserNameFields): string | null {
  return user.preferredName?.trim() || user.name?.trim() || null
}
