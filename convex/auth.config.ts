import type { AuthConfig } from "convex/server"

// Validates WorkOS AuthKit access tokens. Set WORKOS_CLIENT_ID on each Convex
// deployment (`npx convex env set WORKOS_CLIENT_ID client_...`). The client ID is
// public; no WorkOS secret is needed here. See https://docs.convex.dev/auth/authkit/
// Convex exposes deployment env vars on process.env; Node types aren't loaded for Convex code.
declare const process: { env: Record<string, string | undefined> }
const clientId = process.env.WORKOS_CLIENT_ID

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
} satisfies AuthConfig
