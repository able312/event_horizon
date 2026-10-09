import { useCallback, type ReactNode } from 'react'
import { useBackendSession } from '~/lib/data/session'
import { useAuth } from '../state/useAuth'
import { SignInScreen } from './SignInScreen'

/** Renders the app only once the user is signed in and their data connection is authorized. */
export function SessionGate({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  const getAccessToken = useCallback(
    async (options: { forceRefresh: boolean }) => (await window.api?.auth?.getAccessToken(options)) ?? null,
    [],
  )
  const session = useBackendSession({ isSignedIn: auth.isAuthenticated, getAccessToken })

  if (session.status === 'ready') return <>{children}</>
  return <SignInScreen status={session.status} message={session.message} onRetry={session.retry} />
}
