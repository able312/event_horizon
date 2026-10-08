import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '~/features/auth'

/**
 * Login route - serves as the Initiate login URI for WorkOS AuthKit.
 *
 * When users arrive here (e.g., from password reset emails or invitations),
 * this route automatically starts the sign-in flow. If already authenticated,
 * redirects to the return URL or home.
 */
export default function LoginRoute() {
  const { auth, signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const returnTo = searchParams.get('returnTo') || '/'

  useEffect(() => {
    // If already authenticated, redirect to return URL
    if (auth.isAuthenticated) {
      navigate(returnTo, { replace: true })
      return
    }

    // If not loading and not authenticated, start sign-in
    if (!auth.isLoading) {
      signIn()
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate, returnTo, signIn])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {auth.isLoading ? 'Signing in...' : 'Redirecting to sign in...'}
        </p>
      </div>
    </div>
  )
}
