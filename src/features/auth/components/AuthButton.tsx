import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { Button } from '~/components/atoms/button'
import { useAuth } from '../state/useAuth'

interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showUserName?: boolean
}

export function AuthButton({ variant = 'outline', size = 'default', showUserName = true }: AuthButtonProps) {
  const { auth, signIn, signOut } = useAuth()

  if (auth.isLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="animate-spin" />
        {size !== 'icon' && 'Signing in...'}
      </Button>
    )
  }

  if (auth.isAuthenticated && auth.user) {
    return (
      <div className="flex items-center gap-2">
        {showUserName && (
          <span className="text-sm text-muted-foreground">
            {auth.user.firstName || auth.user.email}
          </span>
        )}
        <Button variant={variant} size={size} onClick={signOut}>
          <LogOut />
          {size !== 'icon' && 'Sign out'}
        </Button>
      </div>
    )
  }

  return (
    <Button variant={variant} size={size} onClick={signIn}>
      <LogIn />
      {size !== 'icon' && 'Sign in'}
    </Button>
  )
}
