export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  profilePictureUrl: string | null
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSnapshot {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  /** The last sign-in failure, shown on the signed-out screen. */
  error: string | null
}

export interface AuthApi {
  getStatus: () => Promise<AuthSnapshot>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** Returns a current WorkOS access token, refreshing it when needed; null when signed out. */
  getAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>
  onStatusChanged: (listener: (snapshot: AuthSnapshot) => void) => () => void
}
