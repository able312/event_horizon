import type { AuthSnapshot, AuthUser } from '~/definitions/auth'

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

export const ACTIONS = {
  STATUS_CHANGED: 'STATUS_CHANGED',
  SIGN_IN_START: 'SIGN_IN_START',
  SIGN_OUT: 'SIGN_OUT',
} as const

export type AuthAction =
  | { type: typeof ACTIONS.STATUS_CHANGED; snapshot: AuthSnapshot }
  | { type: typeof ACTIONS.SIGN_IN_START }
  | { type: typeof ACTIONS.SIGN_OUT }

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case ACTIONS.STATUS_CHANGED:
      return {
        isAuthenticated: action.snapshot.isAuthenticated,
        user: action.snapshot.user,
        isLoading: action.snapshot.isLoading,
        error: action.snapshot.error,
      }
    case ACTIONS.SIGN_IN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case ACTIONS.SIGN_OUT:
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      }
    default:
      return state
  }
}
