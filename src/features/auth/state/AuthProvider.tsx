import { useEffect, useReducer, useCallback, type ReactNode } from 'react'
import { ACTIONS, initialAuthState, authReducer } from './authReducer'
import { AuthContext } from './useAuth'
import { synchronizeAuth } from './synchronizeAuth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, dispatch] = useReducer(authReducer, initialAuthState)

  // Synchronize with the Electron auth service
  useEffect(() => {
    if (!window.api?.auth) return
    return synchronizeAuth(window.api.auth, (snapshot) =>
      dispatch({ type: ACTIONS.STATUS_CHANGED, snapshot })
    )
  }, [])

  const signIn = useCallback(async () => {
    if (!window.api?.auth) {
      console.warn('Auth API not available')
      return
    }
    dispatch({ type: ACTIONS.SIGN_IN_START })
    try {
      await window.api.auth.signIn()
    } catch (err) {
      // The main process publishes sign-in failures; this only covers a broken IPC call.
      console.error('Sign in failed:', err)
      dispatch({ type: ACTIONS.STATUS_CHANGED, snapshot: await window.api.auth.getStatus() })
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!window.api?.auth) {
      console.warn('Auth API not available')
      return
    }
    try {
      await window.api.auth.signOut()
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ auth, dispatch, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
