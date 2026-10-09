import { Loader2, LogIn, LogOut, RotateCw } from 'lucide-react'
import { Button } from '~/components/atoms/button'
import type { BackendSessionStatus } from '~/lib/data/session'
import { useAuth } from '../state/useAuth'

interface SignInScreenProps {
  status: Exclude<BackendSessionStatus, 'ready'>
  message: string | null
  onRetry: () => void
}

/** Full-window screen shown until the signed-in user's data connection is ready. */
export function SignInScreen({ status, message, onRetry }: SignInScreenProps) {
  const { auth, signIn, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <div className="window-drag-bar h-10 shrink-0" />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Event Horizon</h1>
          <SignInStatus status={status} message={message} authError={auth.error} />
          <SignInActions
            status={status}
            isSigningIn={auth.isLoading}
            onSignIn={signIn}
            onSignOut={signOut}
            onRetry={onRetry}
          />
        </div>
      </div>
    </div>
  )
}

function SignInStatus({ status, message, authError }: { status: SignInScreenProps['status']; message: string | null; authError: string | null }) {
  switch (status) {
    case 'signed-out':
      return (
        <>
          <p className="text-sm text-muted-foreground">Sign in with your Westlinks Google account to continue.</p>
          {authError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
        </>
      )
    case 'connecting':
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting…
        </p>
      )
    case 'forbidden':
      return <p role="alert" className="text-sm text-destructive">{message ?? 'This account can’t use Event Horizon.'} Sign out and use your Westlinks account.</p>
    case 'rejected':
      return <p role="alert" className="text-sm text-destructive">{message} Try signing out and in again. If it keeps happening, the app and data server are set up for different sign-in environments.</p>
    case 'error':
      return <p role="alert" className="text-sm text-destructive">Couldn’t connect to the data server: {message}</p>
    case 'not-configured':
      return <p role="alert" className="text-sm text-destructive">{message} Rebuild the app with its Convex deployment URL.</p>
  }
}

function SignInActions({
  status,
  isSigningIn,
  onSignIn,
  onSignOut,
  onRetry,
}: {
  status: SignInScreenProps['status']
  isSigningIn: boolean
  onSignIn: () => void
  onSignOut: () => void
  onRetry: () => void
}) {
  if (status === 'signed-out') {
    return (
      <Button onClick={onSignIn} disabled={isSigningIn}>
        {isSigningIn ? <Loader2 className="animate-spin" /> : <LogIn />}
        {isSigningIn ? 'Waiting for the browser…' : 'Sign in with Google'}
      </Button>
    )
  }
  if (status === 'not-configured' || status === 'connecting') return null

  return (
    <div className="flex gap-2">
      {status === 'error' && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      )}
      <Button variant="outline" onClick={onSignOut}>
        <LogOut />
        Sign out
      </Button>
    </div>
  )
}
