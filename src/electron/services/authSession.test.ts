// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveWorkOSClientId } from "./authConfig.js"
import {
  accessTokenExpiry, isCompanyEmail, isRejectedRefresh, needsRefresh, parseCallback, parseStoredSession, toSession,
  REFRESH_MARGIN_MS,
} from "./authSession.js"

function fakeToken(claims: Record<string, unknown>) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${encode({ alg: "RS256" })}.${encode(claims)}.signature`
}

function tokenResponse(email: string, exp: number, refreshToken = "refresh-1") {
  return {
    user: { id: "user_1", email, emailVerified: true, firstName: "Sam", lastName: null, createdAt: "c", updatedAt: "u" },
    accessToken: fakeToken({ sub: "user_1", exp }),
    refreshToken,
  }
}

describe("access tokens", () => {
  it("reads the expiry claim in milliseconds", () => {
    expect(accessTokenExpiry(fakeToken({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000)
  })

  it("rejects tokens without a numeric expiry", () => {
    expect(() => accessTokenExpiry("not-a-jwt")).toThrow()
    expect(() => accessTokenExpiry(fakeToken({ exp: "soon" }))).toThrow(/no expiry/)
  })

  it("builds a session with nullable profile fields and refreshes before expiry", () => {
    const session = toSession(tokenResponse("staff@westlinks.ca", 2000))
    expect(session).toMatchObject({ refreshToken: "refresh-1", expiresAt: 2_000_000, user: { id: "user_1", profilePictureUrl: null, lastName: null } })
    expect(needsRefresh(session, 2_000_000 - REFRESH_MARGIN_MS - 1)).toBe(false)
    expect(needsRefresh(session, 2_000_000 - REFRESH_MARGIN_MS)).toBe(true)
  })
})

describe("company email", () => {
  it("matches only the exact domain, case-insensitively", () => {
    expect(isCompanyEmail("staff@westlinks.ca", "westlinks.ca")).toBe(true)
    expect(isCompanyEmail("Staff@WESTLINKS.CA", "westlinks.ca")).toBe(true)
    expect(isCompanyEmail("staff@weslinks.ca", "westlinks.ca")).toBe(false)
    expect(isCompanyEmail("staff@sub.westlinks.ca", "westlinks.ca")).toBe(false)
    expect(isCompanyEmail("westlinks.ca@gmail.com", "westlinks.ca")).toBe(false)
    expect(isCompanyEmail("@westlinks.ca", "westlinks.ca")).toBe(false)
  })
})

describe("stored sessions", () => {
  it("accepts a well-formed session and discards anything else", () => {
    const session = toSession(tokenResponse("staff@westlinks.ca", 2000))
    expect(parseStoredSession(JSON.stringify(session))).toEqual(session)
    expect(parseStoredSession("{")).toBeNull()
    expect(parseStoredSession("null")).toBeNull()
    expect(parseStoredSession(JSON.stringify({ ...session, refreshToken: undefined }))).toBeNull()
    expect(parseStoredSession(JSON.stringify({ ...session, user: {} }))).toBeNull()
  })
})

describe("callbacks", () => {
  const url = (query: string, path = "/callback") => new URL(`http://127.0.0.1:42070${path}?${query}`)

  it("returns the code only for the expected state", () => {
    expect(parseCallback(url("code=abc&state=s1"), "s1")).toEqual({ kind: "code", code: "abc" })
    expect(parseCallback(url("code=abc&state=other"), "s1")).toMatchObject({ kind: "error" })
    expect(parseCallback(url("code=abc"), "s1")).toMatchObject({ kind: "error" })
  })

  it("reports provider errors and missing codes, and ignores other paths", () => {
    expect(parseCallback(url("state=s1&error=access_denied&error_description=Denied"), "s1")).toEqual({ kind: "error", message: "Denied" })
    expect(parseCallback(url("state=s1&error=access_denied"), "s1")).toEqual({ kind: "error", message: "access_denied" })
    expect(parseCallback(url("state=s1"), "s1")).toMatchObject({ kind: "error" })
    expect(parseCallback(url("state=s1", "/favicon.ico"), "s1")).toEqual({ kind: "ignore" })
  })
})

describe("refresh failures", () => {
  it("treats client errors other than rate limiting as a revoked session", () => {
    expect(isRejectedRefresh({ status: 400 })).toBe(true)
    expect(isRejectedRefresh({ status: 401 })).toBe(true)
    expect(isRejectedRefresh({ status: 429 })).toBe(false)
    expect(isRejectedRefresh({ status: 503 })).toBe(false)
    expect(isRejectedRefresh(new TypeError("fetch failed"))).toBe(false)
  })
})

describe("client ID", () => {
  it("uses development in dev, production when packaged, and honours an override", () => {
    expect(resolveWorkOSClientId(false, {})).toBe("client_01M4EEGGBMS165EF8347V9N9MG")
    expect(resolveWorkOSClientId(true, {})).toBe("client_01M4GQCAWTANP82H2RZ0Y5MV37")
    expect(resolveWorkOSClientId(true, { EVENT_HORIZON_WORKOS_CLIENT_ID: " client_override " })).toBe("client_override")
  })
})
