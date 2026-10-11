import { useContext, createContext } from 'react'
import { initialAuthState, type AuthAction, type AuthState } from './authReducer'

interface AuthContextValue {
  auth: AuthState
  dispatch: React.Dispatch<AuthAction>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

// Default context for use outside provider (e.g., during SSR or testing)
export const AuthContext = createContext<AuthContextValue>({
  auth: initialAuthState,
  dispatch: () => undefined,
  signIn: async () => undefined,
  signOut: async () => undefined,
})

export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
