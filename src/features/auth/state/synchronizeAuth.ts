import type { AuthApi, AuthSnapshot } from '~/definitions/auth'

export function synchronizeAuth(
  api: AuthApi,
  onSnapshot: (snapshot: AuthSnapshot) => void
): () => void {
  let active = true

  const receive = (snapshot: AuthSnapshot) => {
    if (!active) return
    onSnapshot(snapshot)
  }

  // Subscribe to status changes
  const unsubscribe = api.onStatusChanged(receive)

  // Get initial status
  void api.getStatus().then(receive).catch((err) => {
    console.error('Failed to get initial auth status:', err)
    if (active) {
      onSnapshot({ isAuthenticated: false, user: null, isLoading: false })
    }
  })

  return () => {
    active = false
    unsubscribe()
  }
}
