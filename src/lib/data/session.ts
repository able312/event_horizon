import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { api } from "../../../convex/_generated/api"
import { getConvexClient, isBackendAuthError, isBackendConfigured, runMutation } from "./backend"

/**
 * Where the data connection stands for the signed-in user.
 * - `not-configured`: this build has no Convex deployment (see backendConfig.ts).
 * - `signed-out`: no WorkOS session; nothing is cached or subscribed.
 * - `connecting`: Convex is validating the token and recording the user.
 * - `ready`: data calls are authorized.
 * - `forbidden`: the account is not on the company domain (the server's check).
 * - `rejected`: the deployment refused the token, e.g. it trusts a different WorkOS environment.
 * - `error`: anything else went wrong while connecting; `retry` tries again.
 */
export type BackendSessionStatus =
  | "not-configured"
  | "signed-out"
  | "connecting"
  | "ready"
  | "forbidden"
  | "rejected"
  | "error"

export type BackendSession = {
  status: BackendSessionStatus
  /** Set for `forbidden`, `rejected` and `error`. */
  message: string | null
  retry: () => void
}

type SessionOptions = {
  isSignedIn: boolean
  /** Current WorkOS access token, or null when signed out. */
  getAccessToken: (options: { forceRefresh: boolean }) => Promise<string | null>
}

type SessionState = { status: BackendSessionStatus; message: string | null }

/**
 * Connects Convex to the WorkOS session: authenticates the client while signed in,
 * records the user, and drops every cached read and subscription on sign-out.
 */
export function useBackendSession({ isSignedIn, getAccessToken }: SessionOptions): BackendSession {
  const queryClient = useQueryClient()
  const configured = isBackendConfigured()
  const [state, setState] = useState<SessionState>({ status: "signed-out", message: null })
  const [attempt, setAttempt] = useState(0)
  const tokenFetcher = useRef(getAccessToken)
  tokenFetcher.current = getAccessToken

  useEffect(() => {
    if (!configured) return
    const convex = getConvexClient()

    if (!isSignedIn) {
      convex.clearAuth()
      queryClient.clear()
      setState({ status: "signed-out", message: null })
      return
    }

    let active = true
    setState({ status: "connecting", message: null })

    const onAuthChange = async (isAuthenticated: boolean) => {
      if (!active) return
      if (!isAuthenticated) {
        setState({ status: "rejected", message: "The data server didn't accept this sign-in." })
        return
      }
      try {
        await runMutation(api.users.store, {})
        if (active) setState({ status: "ready", message: null })
      } catch (err) {
        if (!active) return
        if (isBackendAuthError(err) && err.code === "Forbidden") {
          setState({ status: "forbidden", message: err.message })
          return
        }
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) })
      }
    }

    convex.setAuth(
      async ({ forceRefreshToken }) => tokenFetcher.current({ forceRefresh: forceRefreshToken }),
      (isAuthenticated) => { void onAuthChange(isAuthenticated) },
    )

    return () => {
      active = false
    }
  }, [configured, isSignedIn, attempt, queryClient])

  if (!configured) {
    return {
      status: "not-configured",
      message: "This build has no data server configured.",
      retry: () => undefined,
    }
  }

  return { ...state, retry: () => setAttempt((count) => count + 1) }
}
