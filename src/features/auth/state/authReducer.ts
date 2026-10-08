import type { AuthSnapshot, AuthUser } from '~/definitions/auth'

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
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
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case ACTIONS.STATUS_CHANGED:
      return {
        isAuthenticated: action.snapshot.isAuthenticated,
        user: action.snapshot.user,
        isLoading: action.snapshot.isLoading,
      }
    case ACTIONS.SIGN_IN_START:
      return {
        ...state,
        isLoading: true,
      }
    case ACTIONS.SIGN_OUT:
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      }
    default:
      return state
  }
}
