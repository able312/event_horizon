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
}

export interface AuthApi {
  getStatus: () => Promise<AuthSnapshot>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  onStatusChanged: (listener: (snapshot: AuthSnapshot) => void) => () => void
}
