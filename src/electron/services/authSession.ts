import type { AuthUser } from "../../definitions/auth.js"

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
  /** Access token expiry (ms since epoch), read from its `exp` claim. */
  expiresAt: number
}

/** Refresh this long before expiry so in-flight requests don't carry a stale token. */
export const REFRESH_MARGIN_MS = 60 * 1000

interface TokenResponse {
  user: {
    id: string
    email: string
    emailVerified: boolean
    profilePictureUrl?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt: string
    updatedAt: string
  }
  accessToken: string
  refreshToken: string
}

/** Reads the `exp` claim without verifying the signature; Convex verifies tokens. */
export function accessTokenExpiry(accessToken: string): number {
  const payload = accessToken.split(".")[1]
  if (!payload) throw new Error("Access token is not a JWT")
  const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  const exp = typeof claims === "object" && claims !== null && "exp" in claims ? claims.exp : undefined
  if (typeof exp !== "number" || !Number.isFinite(exp)) throw new Error("Access token has no expiry")
  return exp * 1000
}

export function toSession(response: TokenResponse): AuthSession {
  const { user } = response
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      profilePictureUrl: user.profilePictureUrl ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: accessTokenExpiry(response.accessToken),
  }
}

export function needsRefresh(session: AuthSession, now: number): boolean {
  return session.expiresAt - REFRESH_MARGIN_MS <= now
}

export function isCompanyEmail(email: string, domain: string): boolean {
  const at = email.lastIndexOf("@")
  return at > 0 && email.slice(at + 1).trim().toLowerCase() === domain
}

/** Validates a stored session's shape; anything else is discarded. */
export function parseStoredSession(json: string): AuthSession | null {
  try {
    const value: unknown = JSON.parse(json)
    if (typeof value !== "object" || value === null) return null
    const session = value as Partial<AuthSession>
    if (typeof session.accessToken !== "string" || typeof session.refreshToken !== "string" ||
      typeof session.expiresAt !== "number" || typeof session.user?.id !== "string" || typeof session.user.email !== "string") {
      return null
    }
    return session as AuthSession
  } catch {
    return null
  }
}

export type CallbackResult =
  | { kind: "code"; code: string }
  | { kind: "error"; message: string }
  | { kind: "ignore" }

/** Interprets a request to the loopback server for the sign-in started with `expectedState`. */
export function parseCallback(url: URL, expectedState: string): CallbackResult {
  if (url.pathname !== "/callback") return { kind: "ignore" }
  if (url.searchParams.get("state") !== expectedState) {
    return { kind: "error", message: "This sign-in link has expired. Start signing in again from Event Horizon." }
  }
  const error = url.searchParams.get("error")
  if (error) return { kind: "error", message: url.searchParams.get("error_description") || error }
  const code = url.searchParams.get("code")
  return code ? { kind: "code", code } : { kind: "error", message: "WorkOS did not return an authorization code." }
}

/** A 4xx (other than rate limiting) from the token endpoint means the refresh token is no longer usable. */
export function isRejectedRefresh(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) return false
  const { status } = error
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429
}
