# Collaboration Migration Plan

High-level plan to take the app from a single-user, local-only Electron app to a basic multi-user collaborative app. Each step lists its purpose, the pieces involved, and what "done" looks like. Detailed implementation plans should be written per step against the actual codebase.

## Current state

- Electron app, used by one person.
- Data stored on disk via better-sqlite3 (synchronous).
- Built on macOS, for macOS only.
- Local CI runs tests, builds, and pushes draft releases to GitHub Releases.

## Target state (minimum viable collaboration)

- Shared data hosted in **Convex**, with live updates across clients.
- Sign-in restricted to company **Google Workspace** accounts via **WorkOS AuthKit**.
- macOS **and Windows** builds published to GitHub Releases.

## Key decisions

| Area | Decision | Rationale |
|---|---|---|
| Backend / database | Convex | Authorization lives in TypeScript functions instead of RLS policies; reactive queries suit collaboration; plain-JS client means no native modules. |
| Auth | WorkOS AuthKit (Google as the identity provider) | Hosted sign-in + redirect suits native/Electron apps; integrates with Convex via JWT. |
| Domain restriction | Enforced server-side in Convex | The auth provider config alone is not trusted; every Convex function verifies the email domain. |
| Windows build | Added to the existing release flow | Likely buildable from macOS once native modules are removed; otherwise a CI Windows runner. |
| Where Convex is called | From the renderer, only through `src/lib/data` | Convex is designed for direct client use and live queries. Electron main still treats the renderer as untrusted, and Convex functions enforce auth themselves. Keeping every backend call in one folder means a future backend swap only touches that folder. |
| Offline use | Not supported | The app has never been needed without internet. |
| Permissions | Any signed-in company account can read and edit everything | All data is shared team-wide; no per-user records yet. |
| Users | 5–6 people: 4 on Windows, 1 on macOS | Small enough for Convex's free/starter limits; Windows is the main platform. |
| Code signing | No paid signing services | macOS uses the existing self-signed certificate. Windows needs a free workaround (see Step 4). |

---

## Step 1 — Isolate data access

**Purpose:** Make the backend swap mechanical by routing all database access through one async layer while still on local SQLite.

**Pieces involved**
- Inventory of every place the app reads or writes the database (main process, IPC handlers, renderer calls).
- A single data-access module with an async interface (one function per operation).
- IPC boundary between renderer and main, if DB access currently lives in main.
- Existing tests, updated to target the new layer.

**Done when**
- No code outside the data layer imports better-sqlite3 or runs SQL.
- All data-layer functions are async, and callers `await` them.
- The app behaves identically to today.

**Status: implemented, awaiting smoke test.** Because Convex will be called from the renderer, the data layer is the renderer's `src/lib/data` folder, not the main-process repositories (those are replaced outright in Step 2).
- `src/lib/data/*` holds every data operation (async, currently over IPC). `src/lib/ipc/*` holds Electron-only features (PDF save, links, menus, navigation, the ICS file push).
- `src/lib/data/queries.ts` owns every React Query key and fetcher. Hooks build on these and never write keys by hand.
- ESLint blocks `window.electron` outside those two folders, Convex imports outside `src/lib/data`, and renderer imports of main-process or storage code.
- Shared record types in `src/definitions` no longer come from the SQLite schema. `src/electron/db/schemaConformance.ts` fails the typecheck if the schema and types drift.
- ICS import: main only parses the file. Duplicate checks and the insert go through the data layer, and the insert re-checks calendar ids in one transaction.

## Step 2 — Stand up Convex and migrate data

**Purpose:** Move the data and data operations to Convex.

**Pieces involved**
- Convex project setup (dev and prod deployments).
- Convex schema translated from the SQLite schema, including indexes for every filtered or sorted query.
- Convex queries and mutations that replace each data-layer function; joins become explicit lookups.
- Data-layer implementation swapped from SQLite to the Convex client.
- One-time data migration: export SQLite tables, then import with `npx convex import`. ID and foreign-key mapping needs attention here.
- Ownership and audit fields on records that need them (e.g. `createdBy`, `updatedBy`, `updatedAt`).
- A decision on concurrent edits: last-write-wins vs. conflict checks per record type.
- UI changes to take advantage of reactive queries, where useful.

**Done when**
- The app runs entirely against Convex, with existing data present.
- Changes made in one client appear in another without a refresh.
- better-sqlite3 is removed from dependencies, or any remaining use is justified.

**Notes for the Step 2 detailed plan (found during Step 1)**
- Live updates: either the `@convex-dev/react-query` adapter (new dependency; its cache keys differ from ours, so only `queries.ts` key factories change) or a small custom bridge that subscribes per query key. Needs a dependency decision.
- Cart details and tournament details are created on first read (`getOrCreate…`). Convex queries can't write, so these become "create with the event" or an explicit mutation.
- The contacts directory uses cursor pagination (`useInfiniteQuery`); map it to Convex's paginated queries.
- Some creates accept a client-generated `id` for optimistic updates (beverage items). Convex generates its own ids, so keep the UUID as a separate field or drop client ids.
- `payments:get-many-by-event-id` returns a single payment and throws when none exist, so the UI loads every payment and filters. Replace it with a proper by-event query.
- Several data functions are unused (`getAllEvents`, `getCartDetails`, `getTournamentDetails`, `createCartDetails`, `deleteCartDetails`, `createTournamentDetails`, `deleteTournamentDetails`, `findContactByEmail`, the `db-stats` channel). Don't port them.
- Search (`events:search`, `contacts:search`) uses SQL `LIKE` with relevance ranking; Convex needs search indexes or a different approach.

## Step 3 — Authentication (WorkOS + Google Workspace)

**Purpose:** Only company users can access the app and its data.

**Pieces involved**
- WorkOS AuthKit configured with Google as the provider; redirect URIs registered for the desktop app.
- Electron sign-in flow: open the system browser, use OAuth with PKCE, and return to the app via a custom protocol (`yourapp://`) or a loopback redirect. No embedded browser windows.
- Secure token storage in the OS keychain (e.g. Electron `safeStorage`), plus refresh and sign-out handling.
- Convex auth config that validates WorkOS-issued JWTs; the email claim must be included.
- A shared Convex auth helper, called by every query and mutation, that requires an identity and checks the company email domain.
- A users table in Convex, created or updated on first sign-in.
- App UI: signed-out state, sign-in screen, current-user display, sign-out.

**Done when**
- The app is unusable without signing in.
- A non-company Google account is rejected server-side, even if it gets through the auth provider.
- Every Convex function enforces auth; none are publicly callable without an identity, except intentionally public ones, which should be none at first.

## Step 4 — Windows build and distribution

**Purpose:** Coworkers on Windows can install and update the app.

**Pieces involved**
- Electron packaging config extended with a Windows target (NSIS installer).
- Build location: cross-build from macOS if there are no native modules; otherwise a Windows runner (e.g. GitHub Actions `windows-latest`) triggered on release.
- Custom protocol registration on Windows, needed for the auth redirect from Step 3.
- Code signing: no paid signing. Windows builds will be unsigned or self-signed, so SmartScreen will warn on first install, and auto-update must not rely on publisher verification. Options to evaluate: unsigned NSIS with documented "More info → Run anyway", or a self-signed certificate installed on each of the 4 Windows machines (like the macOS setup). macOS keeps the existing self-signed certificate.
- Auto-update (e.g. `electron-updater`, using GitHub Releases as the feed) for both platforms.
- Release flow updated so macOS and Windows artifacts land on the same draft release.
- Platform-specific checks: file paths, menus, window chrome, keyboard shortcuts.

**Done when**
- A tagged release produces signed macOS and Windows installers on one GitHub Release.
- A Windows user can install, sign in, see shared data, and receive an update.

---

## Sequencing

- Steps 1 → 2 → 3 run in order. Step 3 can be started alongside the end of Step 2, but Convex functions must enforce auth before anyone else gets access.
- Step 4 is mostly independent and can run in parallel. The custom protocol registration and the removal of native modules tie it to Steps 2–3.
- Rollout: keep using the current local version until Steps 2–3 are complete, run a final data migration, then distribute.

## Cross-cutting concerns

- **Environments:** separate Convex dev and prod deployments, plus matching WorkOS environments. The app build needs to know which one to target.
- **Secrets:** no secrets in the Electron bundle. The desktop app is a public client (PKCE), and only public config ships with it.
- **Backups:** confirm Convex backup and export options before relying on it as the source of truth.
- **Testing:** the data-layer tests from Step 1 should carry over to Convex, plus tests for auth enforcement (unauthenticated and wrong-domain calls are rejected).

## Answered questions

- Shared vs. owned records: everything is shared; company membership is the only permission.
- Users: 5–6 (4 Windows, 1 macOS).
- Data outside SQLite: none found (no localStorage/IndexedDB use; settings are in code).
- macOS signing: self-signed certificate (`LNC Internal Signature`), no notarization. See `docs/MACOS_SIGNING.md`.
