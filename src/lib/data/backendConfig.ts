/**
 * Which Convex deployment the renderer talks to. Each build targets exactly one:
 *
 * - Development (`npm run dev`): `VITE_CONVEX_URL`, which `npx convex dev` writes to
 *   this checkout's ignored `.env.local`. The main checkout points it at the shared
 *   cloud dev deployment; every other worktree points it at its own local deployment
 *   (see `npm run convex:worktree`), so branch work can't touch main's data.
 * - Packaged builds: only `VITE_CONVEX_PRODUCTION_URL`. A release built from any
 *   checkout never falls back to that checkout's dev or local deployment; without the
 *   production URL the app fails closed, like the production WorkOS client ID.
 */
export type BackendEnv = {
  DEV: boolean
  VITE_CONVEX_URL?: string
  VITE_CONVEX_PRODUCTION_URL?: string
}

export function resolveConvexUrl(env: BackendEnv): string | null {
  const url = (env.DEV ? env.VITE_CONVEX_URL : env.VITE_CONVEX_PRODUCTION_URL)?.trim()
  return url ? url : null
}
