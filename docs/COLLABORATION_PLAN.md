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

**Status: backend operation ports implemented and auth-guarded; renderer integration done, and post-save refreshes removed (see "Redundant refresh removal" below).** Audit/simultaneous-edit decisions and data migration remain pending.

Completed:
- Installed `convex` and `@convex-dev/react-query` (`b51f523`). The adapter is the selected approach for live queries; renderer integration is still pending.
- Added `convex/schema.ts` with the initial table definitions and indexes, shared enum/nullable validators, a document-to-record conversion helper, Convex TypeScript config, and generated API/data-model files (`b93d214`). Index coverage still needs checking against the queries as they are ported.
- Configured the local development deployment in this worktree's ignored `.env.local`. Production deployment setup is still pending.
- Installed the official Convex testing dependencies: `convex-test` and `@edge-runtime/vm`. Vitest was already installed; see the [Convex testing guide](https://docs.convex.dev/testing/convex-test).
- Configured separate Vitest projects: `app` retains the existing jsdom/React setup, and `convex` runs `convex/**/*.test.ts` in `edge-runtime` without that setup. Shared validators and document-to-record conversion now have `convex-test` coverage. Run just these tests with `npx vitest run --project convex`; `npm test` runs both projects. Typecheck Convex (including tests) with `npx tsc --project convex/tsconfig.json --noEmit`.
- Ported `convex/payments.ts`, `menuOfChargeItems.ts`, `touchpoints.ts`, `cartDetails.ts`, and `tournamentDetails.ts`. Operations return shared record shapes via `toRecord`; inserts validate parent-event existence, patches allow only editable fields, and missing-row updates/deletes fail explicitly. Parent IDs and creation timestamps are immutable. No schema changes or dependencies were needed.
- Payments now have a proper indexed by-event query returning all matching payments (or `[]`), while retaining the used all-payments query until renderer integration. Charge items use the existing by-event index. Touchpoint queries use the by-event/completion indexes and explicitly join event titles.
- Cart/tournament reads are read-only; `ensureByEventId` is an explicit, idempotent mutation using the by-event index. Renderer integration must initialize before subscribing to the read query. The indexed read and insert share a Convex transaction, which protects against duplicate initialization under competing writes. Unused list/create/delete operations were not ported.
- Common touchpoint seeding reuses the existing templates and now accepts the client's IANA time zone, so server execution preserves the desktop's calendar dates. Seeding stays an explicit batch mutation; repeated calls intentionally add another set, matching the existing operation.
- The new functions are **internal** (`internalQuery`/`internalMutation`) while auth is pending, so there is no unauthenticated client API. Before renderer integration, introduce authenticated public functions with the shared company-domain guard from Step 3. Internal visibility is temporary staging, not a substitute for that guard. (Done 2026-10-09: all are now public and guarded; see Step 3 progress below.)
- Added operation coverage in `convex/operations.test.ts` for CRUD/defaults, event isolation, rejected inputs, missing parents/records, read-only queries, repeated detail initialization, and time-zone-aware seeding. This is mock-backend coverage; actual concurrent-write retries and live-client updates still need deployment verification. Regenerated the typed API with `npx convex codegen --typecheck enable`.
- Ported `convex/foodItems.ts`, `beverageItems.ts`, and `timeblocks.ts`, all as internal functions. Reads use the existing event/section, food-parent, beverage-event, and assignment indexes; no schema changes or dependencies were needed. Food creates require an existing food timeblock. Beverage create-and-assign and assignment replacement are atomic; links require a beverage timeblock in the same event, and duplicate IDs are rejected. Ordinary patches cannot change parents, section types, IDs, or creation timestamps.
- Timeblock conversion reuses `buildConversionImpact` and recomputes the impact inside the mutation before requiring destructive confirmation. Leaving food deletes its food items; leaving beverage removes only its links, preserving shared beverage items and other timeblocks' assignments. Timeblock deletion explicitly removes food items and beverage links; beverage item deletion explicitly removes its links. Event-level cascades remain part of the upcoming events port.
- Extracted the existing timeline assembly into `src/lib/timeblocks/buildTimelineRows.ts`, reused by both the SQLite repository and Convex. It preserves item joins, strict HH:mm filtering, sorting, tournament/cart synthetic rows, and desktop local-time behavior. Convex timeline reads require the client's IANA time zone. Synthetic rows now use the event's stable creation timestamp instead of the query execution time. Queries never initialize detail documents.
- Added 16 operation tests in `convex/sections.test.ts` and 7 pure timeline tests for desktop time conversion, midnight, and daylight-saving transitions. Coverage includes CRUD/defaults, event isolation, immutable fields, missing parents/records, atomic assignment failure, deletion cascades, stale conversion inspections, destructive confirmation, shared-item preservation, and read-only timeline queries.
- Verification for this batch: `npm test` passed (151 files, 1,135 tests; includes 190 Convex tests), `npm run build` passed, Convex typecheck/codegen passed, and `npm run lint` passed with seven existing warnings (generated directives and React Fast Refresh exports). Both dependency audits reported zero vulnerabilities. Desktop smoke testing and actual multi-client/concurrent-write verification remain pending.

Implementation decisions for this batch:
- Convex owns new IDs. Beverage functions deliberately reject client-generated IDs: renderer integration must reconcile temporary optimistic UUIDs with the returned Convex ID before subsequent edits/assignments. Do not add UUID fields to the schema solely for optimistic UI. SQLite import must separately map legacy UUIDs to Convex IDs and rewrite all foreign keys; this migration implementation is still pending.
- Patches update only supplied fields. Overlapping edits currently use last-write-wins; cart/tournament `updatedAt` is set by the server. User audit fields and the final concurrency policy remain pending before rollout.
- Preserve the existing record defaults, timestamp formats, and enum validators. Do not move records between events through ordinary field edits.

- Ported `convex/contacts.ts`, `contactRoles.ts`, `vendorCategories.ts`, `eventContacts.ts`, and `events.ts`, retaining internal visibility until authenticated public functions are ready. No schema changes or dependencies were needed. Regenerated the typed API and uploaded the internal functions to the configured development deployment through Convex codegen; no existing SQLite data was imported or modified.
- Contacts preserve trimmed/derived names, normalized active-email uniqueness, structured errors (including `existingContactId`), archive/restore constraints, hard-delete restrictions, and transactional merges of roles, active duplicates, removed history, and missing shared fields. `ConvexError` carries the existing contact error payload; renderer integration must translate it back to `ContactsError` for current UI handling.
- Standing roles remain idempotent and separate from event assignments. Vendor categories preserve key uniqueness, immutable keys once used (including historical assignments), archive/restore, and idempotent default seeding. Extracted the existing category defaults into `src/lib/contacts/vendorCategoryDefaults.ts` and contact field validation into the existing `contactRules.ts`; both SQLite and Convex reuse these.
- Event assignments preserve inline contact creation, reactivation of removed assignments, role/category rules, primary selection per event and role, exact-group reordering, panel order, contact history, and recipient resolution. Shared-contact-plus-assignment edits are atomic. `convex/lib/contactOperations.ts` owns transaction-local operations reused by registered functions and atomic event creation; `contactValidators.ts` shares allowlisted input validators.
- Event creation atomically assigns a primary client and reuses an active contact with the same normalized email without overwriting their shared details. Calendar import rechecks calendar IDs inside its mutation, including earlier inserts in the same batch; an invalid new row rolls back the batch. Start-range and unscheduled reads use the existing index. Renderer month queries must compute desktop-local month boundaries with the existing month helper and call `getStartingBetween`.
- Event deletion explicitly removes payments, touchpoints, charge items, cart/tournament details, active and removed event assignments, timeblocks, food items, beverage items, and all beverage links. Shared contacts, standing roles, and categories survive, as do other events' documents.
- Search preserves literal, case-insensitive substring matching, active client joins, event relevance ranking, optional filters, and exact event pagination totals. Contact pagination uses an opaque name/ID keyset cursor scoped to the normalized filters, replacing SQLite's offset cursor. Contact and event search scan the small venue dataset; this is a deliberate compatibility implementation, not Convex full-text search. Revisit with denormalized search documents/indexes before data volume approaches transaction read limits. Contact renames or filter changes can still change membership/order while paging; filters require restarting pagination.
- Added `convex/contacts.test.ts`, `eventContacts.test.ts`, and `events.test.ts` covering all ported operations, invalid/missing records, email conflicts, immutable fields, archive/restore/merge, standing-role/category constraints, assignment reactivation, primary invariants, ordering, recipient resolution, atomic rollback, calendar duplicates, search, and all event cascades. These tests use `convex-test`; deployed multi-client retries and live update behavior still require verification after authentication and renderer integration.

Verification for this batch: `npm test` passed (154 files, 1,155 tests, including 210 Convex tests); `npm run build`, Convex codegen/typecheck, and `npm run lint` passed. Lint retains the same seven existing warnings.

**WorkOS configuration check (2026-10-09).** The WorkOS CLI isn't installed and the WorkOS MCP server isn't authenticated in this session, so the dashboard couldn't be read directly. These results come from public WorkOS endpoints:
- The development client ID in `.env.local` belongs to an AuthKit **sandbox** environment. Its JWKS endpoint resolves. `.env.local` also has a `WORKOS_CLAIM_TOKEN`, which suggests the environment was created by the WorkOS installer and may not be claimed by a WorkOS account yet.
- The only registered Redirect URI that was found is `http://localhost:42069/callback`. That is the Vite dev server port, so it can't serve as the desktop callback. `http://localhost:42070/callback` and `127.0.0.1` URIs are rejected as unregistered.
- Google OAuth responds for this client (it redirects to Google). This may be WorkOS's shared demo Google credentials; whether AuthKit offers only Google, and whether access tokens include `email`, can't be verified without dashboard access and a real sign-in.
- Company domain confirmed by the user: **`westlinks.ca`** (2026-10-09).

### Step 3 (authentication) progress

**Status: auth code implemented; stopped for human WorkOS setup and sign-in testing (2026-10-09).** The app still reads and writes SQLite. No renderer data calls go to Convex yet, and no sign-in gate is active.

Completed:
- `convex/auth.config.ts` validates WorkOS access tokens: both WorkOS issuers, RS256, and the client JWKS, following the [Convex AuthKit guide](https://docs.convex.dev/auth/authkit/). `WORKOS_CLIENT_ID` is set on the Convex dev deployment. It is a public value; no WorkOS secret is stored in Convex.
- `convex/lib/auth.ts`:
  - `requireCompanyUser` rejects missing identities (`Unauthenticated`), and rejects missing emails or emails not exactly on `westlinks.ca` (`Forbidden`, including subdomains). Errors are `ConvexError`s.
  - `companyQuery` and `companyMutation` run that check before every handler.
  - All 76 previously internal operations are now public functions built with these wrappers. There are no internal, action, or unguarded functions.
- Added a `users` table and `convex/users.ts`. `store` upserts the signed-in account, keyed by WorkOS user ID and holding a lowercased email and name. `current` reads it back. This is a Convex schema addition only; no SQLite migration is involved.
- `convex/auth.test.ts` loads every deployable module and checks that every registered function:
  - is public;
  - rejects unauthenticated, wrong-domain, subdomain, and email-less callers before touching the database.

  It also covers client-API rejection, the domain matcher, and the users upsert. Other Convex tests now call `api.*` with a company identity (`convex/lib/testIdentity.ts`). Adding an unguarded test function makes the suite fail.
- Replaced the installer-generated Electron auth service:
  - It no longer uses `WORKOS_API_KEY`. The app is a public PKCE client (`@workos-inc/node` public-client mode).
  - The redirect is a loopback URI, `http://127.0.0.1:42070/callback`. It was `localhost` until 2026-10-10, but WorkOS production rejects `localhost` and allows the loopback IP for native apps. The server binds IPv4 loopback only, runs only during sign-in, and stops after 5 minutes. The callback must return the expected `state`, and HTML responses are escaped.
  - Accounts outside `westlinks.ca` are refused on the client as well, but the server check is the one that counts.
  - Token expiry is read from the JWT. Concurrent refreshes share one request, because refresh tokens are single-use. A 4xx refresh rejection signs the user out. Network failures keep the session while the token is still valid. `getAccessToken({ forceRefresh })` is ready for Convex's `setAuth` callback.
  - The session is stored only through Electron `safeStorage`. If encryption is unavailable, the session stays in memory.
  - Auth IPC checks the sender like the updater IPC (top-level app page only) and validates arguments. This also fixes a `require` in ESM that would have crashed when broadcasting status.
- `src/electron/services/authConfig.ts` holds the callback port, redirect URI, company domain, and public client IDs. The main process never loaded `.env.local`, so the previous code always ran with an empty client ID. The development client ID is now committed (public). Packaged builds use `PRODUCTION_CLIENT_ID`, which is `null` and fails closed until production is configured. `EVENT_HORIZON_WORKOS_CLIENT_ID` overrides it for testing.
- The renderer auth state now carries a sign-in `error` for the upcoming signed-out screen.
- Tests:
  - `authSession.test.ts`: token expiry, session parsing, callback/state, refresh errors, client-ID selection.
  - `authService.test.ts`: PKCE flow, state forgery, wrong domain, superseded attempts, timeout, missing config, port failure, storage fallback, refresh deduplication, revocation, network failure, sign-out.
  - `authHandler.test.ts`: routing, broadcast, sender and argument rejection.

Verification for this batch:
- `npm test` passed: 158 files, 1,190 tests.
- `npm run build` and the Convex typecheck passed. Convex codegen uploaded the guarded functions to the dev deployment.
- `npm run lint` passed with the same seven existing warnings.
- Not verified: a real sign-in, the loopback server inside Electron, the token's `email` claim, and Convex accepting a live WorkOS token. Each of these needs the WorkOS setup below.

Known limitations and decisions to revisit:
- Signing out clears the app session but not the browser's AuthKit session. Switching accounts may need a browser sign-out. Fixing this needs a registered Sign-out URI and a `getLogoutUrl` flow.
- The in-app `/login` route from the installer commit can't serve as an Initiate login URI for a desktop app. It isn't needed while sign-in is Google-only and started from the app. It was left in place.
- Sign-in now goes straight to Google (`provider: "GoogleOAuth"`) with `prompt=select_account` and `hd=westlinks.ca` (2026-10-09). Through the AuthKit page, the browser's AuthKit session silently reused the last account: after a wrong-account refusal there was no way to switch, and clearing cookies didn't help. `hd` only hints the chooser; Convex's domain check is still the one that counts.
- `.env.local` still holds `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, and `WORKOS_REDIRECT_URI` from the installer. The app no longer reads them. Keep the API key out of the app and out of git.

**WorkOS setup progress (2026-10-09).** The sandbox is claimed as **Event Horizon Dev** (`environment_01M4EEGG041B62ACHXZRAZ6NWB`) in the user's WorkOS team. The CLI's active environment is **Staging**, so pass `--environment-id` explicitly.
- Done (step 1): the redirect URI list is now only `http://localhost:42070/callback`, set as default. The unused `42069` URI was removed.
- Done (step 2): the JWT template is `{"email": {{ user.email }}}`, set through the API with the sandbox key and confirmed through the WorkOS MCP server.
- Tested by the user: a non-company Google account is refused with the wrong-account message. That test exposed the stuck-account problem fixed above; the company-account sign-in hasn't been retested since.
- Pending (step 3): password, Apple, GitHub, Microsoft and SSO sign-in are still on. Neither the CLI nor the public API can change these, and the MCP server's write tools failed in this session. Turn them off in the dashboard.

**Human handoff — stop here.** In the WorkOS dashboard for the development environment (claim it first if necessary):
1. Add the Redirect URI `http://localhost:42070/callback`. Remove `http://localhost:42069/callback` unless something else needs it.
2. Add a JWT template that puts the email in the access token under the standard claim name, e.g. `{ "email": {{ user.email }} }` (see [JWT templates](https://workos.com/docs/authkit/jwt-templates)). Without it, Convex rejects every call as `Forbidden`.
3. Enable Google sign-in. Disable email/password and other methods, so that only verified Google Workspace accounts can sign in. For production, use your own Google OAuth credentials instead of WorkOS demo credentials.
4. Then run `npm run dev`, click **Sign in** in the sidebar footer, and sign in with a `westlinks.ca` account. Check that the sidebar shows **Sign out**, and that a non-company Google account is refused. Report any error shown.

Resume after that handoff:
1. Optionally confirm with a real token that Convex accepts it, i.e. `users.store` succeeds.
2. Step 2 renderer integration:
   - Create the Convex client in `src/lib/data` with `setAuth` backed by `window.api.auth.getAccessToken`, and the React Query adapter.
   - Add a signed-out/sign-in screen that gates the app, and call `users.store` after sign-in.
   - Replace IPC-backed data operations, and adapt query keys and contact keyset pagination.
   - Replace all-payments filtering with the by-event query, and get-or-create detail reads with explicit initialization followed by subscriptions.
   - Pass the IANA time zone to timeline reads and seeding, reconcile optimistic beverage IDs, and translate `ConvexError` contact and auth errors.
3. Production setup and audit/concurrency decisions. Then SQLite export/import with ID and foreign-key mapping, and its tests.
4. Human verification of desktop sign-in, migrated data integrity, and two-client live updates. Then remove SQLite and finish Windows packaging. Keep the local app and data intact until then.

### Step 2 renderer integration progress (2026-10-09)

**Status: implemented and tested against an isolated local deployment; authenticated desktop smoke tests pending.** The renderer data layer calls Convex and a sign-in gate wraps the app. The follow-up below records verification and the human handoff. Changes remain uncommitted.

What changed (all of it in `src/lib/data`, except the gate and two components):
- `backendConfig.ts`: picks the deployment URL. Dev builds read `VITE_CONVEX_URL`. Packaged builds read **only** `VITE_CONVEX_PRODUCTION_URL` and fail closed without it, so a release never targets a dev or worktree deployment.
- `backend.ts`: a lazy `ConvexReactClient`, plus `runQuery`, `runMutation`, `fetchSource` and `createAppQueryClient`.
  - `translateBackendError` turns `ConvexError` payloads back into `ContactsError` (so existing UI checks like `EmailTaken` + `existingContactId` keep working), and turns `Unauthenticated`/`Forbidden` into `BackendAuthError`.
  - `pickFields` allowlists the fields for each create and update. Convex rejects undeclared fields, and the renderer's `Update*` types are wider than the validators. SQLite silently ignored the extra fields.
- `liveQueries.ts`: **our own small React Query ↔ Convex bridge, used instead of `@convex-dev/react-query`.**
  - The adapter only keeps keys shaped `["convexQuery", name, args]` live. Using it would mean rewriting the app's key hierarchy (prefix invalidation, `setQueriesData` optimistic updates, ~60 call sites and their tests).
  - The bridge keeps our keys. A cached read opts in with `meta` (`liveMeta`). After its first successful fetch, it subscribes to the same Convex query, and unsubscribes when React Query garbage-collects it.
  - Disabled reads never fetch, so they never subscribe with placeholder IDs.
  - Live reads use `staleTime: Infinity`. The existing invalidations still work; they're now redundant round trips that can be removed later.
- `sources.ts`: one place that defines every live read (Convex function + exact args). Data functions fetch through these and `queries.ts` subscribes to the same ones, so the cached value and its live updates can't come from different calls.
- Data modules rewritten against `api.*`. Unused functions were dropped (`getAllEvents`, `findContactByEmail`, the cart/tournament list/create/delete/get functions, `getAllPayments`). `contactsResult.ts` (the IPC envelope) was removed.
- Payments: the all-payments-then-filter fetch is replaced by `payments.getByEventId`.
- Months: `getEventsByMonth` computes desktop-local month boundaries with `getMonthRangeUtcFromLocal` and calls `events.getStartingBetween`.
- Time zones: timeline reads and touchpoint seeding pass `desktopTimeZone()`.
- **Event-detail setup:** cart and tournament reads run the idempotent `ensureByEventId` mutation as their fetcher. It returns the same record as `getByEventId`. The read then subscribes to `getByEventId`. Because subscribing waits for the first successful fetch, it never sees "not found" before initialization.
- **Contact pagination:** the directory is still a `useInfiniteQuery` over the opaque keyset cursor.
  - Each loaded page is subscribed. When any page actually changes, every page is refetched from the first. This avoids splicing pages, which could skip or duplicate contacts that moved across a page boundary.
  - A filter change is a new key, so it restarts from the first page, as the cursor requires.
- **Optimistic IDs (beverage items):** handled in `optimisticIds.ts`.
  - `createWithClientId` registers the client UUID while the create is pending. `update`, `delete` and `setTimeblocks` call `resolveRecordId`, which waits for the server ID, so edits typed into a just-added row aren't sent with an invalid ID.
  - `getRecordRenderKey` gives the row a React key and `data-beverage-item-id` that survive the ID swap, so the focused name input isn't remounted. It's used in `BeverageWorkspaceSection.tsx` and `BeverageEditorWorkspace.tsx`.
- **Sign-in:** handled by `session.ts`, `features/auth/components/SessionGate.tsx` and `SignInScreen.tsx`.
  - `useBackendSession` calls `convex.setAuth` with `window.api.auth.getAccessToken`. Once Convex accepts the token, it calls `users.store`.
  - On sign-out it runs `clearAuth()` and `queryClient.clear()`, which drops all cached data and subscriptions.
  - The gate (in `main.tsx`) shows these states: signed out, connecting, forbidden (wrong domain, from the server), rejected (the deployment trusts a different WorkOS environment), error (with retry), and not configured.
- Convex: one-line change in `convex/contacts.ts` (`items.at(-1)` → index access), because the app's ES2020 typecheck now includes Convex sources through `_generated/api`. Not deployed yet.

**Previous follow-up list (completed items recorded below):**
1. `src/lib/data/dataContracts.test.ts` (74 tests) asserts IPC channel names. Rewrite it to mock `./backend` and assert each data function calls the right `api.*` function with the allowlisted arguments. Also add tests for:
   - `translateBackendError`, `pickFields` and `resolveConvexUrl`;
   - the `liveQueries` bridge (with a fake `WatchClient`);
   - `optimisticIds`;
   - `useBackendSession` state transitions.

   These are required by the test policy and haven't been written yet.
2. `EventDetailHeaderBar.test.tsx` (3 tests) mocks the `touchpoints:`/`event-contacts:` IPC channels. Mock `~/lib/data/touchpoints` and `~/lib/data/eventContacts` instead. The other hook tests already mock the data modules and pass.
3. `AuthButton` and the installer's `/login` route are now redundant inside the gate. Decide whether to keep the sidebar sign-out button (probably yes) and whether to delete `/login`.
4. Push the Convex change (`npx convex dev --once`), then smoke test: sign in, then create, edit and delete across every section. Check the beverage add-then-type flow, cart/tournament first open, contact directory paging, and two windows/clients updating each other.
5. Not done: removing the now-redundant invalidations; data migration from SQLite; production deployment.

### Database isolation (requirement, 2026-10-09)

The SQLite setup isolates data per environment, and the Convex setup must keep doing so: **production** has its own database, the **main branch** has its own, and **every other worktree gets its own isolated database**. Branch work must never touch main's or production's data.

Planned Convex mapping:

| Environment | SQLite today | Convex |
|---|---|---|
| Installed app | `userData/app.sqlite` | Production deployment, set via `VITE_CONVEX_PRODUCTION_URL` at build time (the app fails closed without it). Its `WORKOS_CLIENT_ID` is the production WorkOS client. |
| Main checkout (`npm run dev`) | `userData/app.sqlite` | The cloud **dev** deployment (`dev:glor…`), via `VITE_CONVEX_URL` in main's `.env.local`. |
| Other worktrees | `<worktree>/.event-horizon/app.sqlite`, seeded | A Convex **local** deployment per worktree (`npx convex dev --configure existing --dev-deployment local`). Convex 1.46 keeps its state in `<worktree>/.convex/local/default`, so each worktree is isolated. It needs `npx convex env set WORKOS_CLIENT_ID <dev client>` and a seed like `developmentSeed.ts`. |

Original isolation gaps (resolved in the follow-up below):
- **This worktree previously pointed at the cloud dev deployment**, i.e. main's future database. Earlier steps also pushed functions there with `convex codegen`. Switch this worktree to a local deployment before testing writes.
- Add a script (e.g. `npm run convex:worktree`) that configures the local deployment, sets `WORKOS_CLIENT_ID`, and seeds it.
- Add `convex dev` to `npm run dev` so each checkout pushes functions to its own deployment.
- Add an internal seed mutation. `convex/auth.test.ts` currently requires every function to be public, so it needs an explicit exception for that one.
- Confirm that `.convex/` is git-ignored (Convex writes its own `.gitignore` there).

### Renderer verification and worktree isolation follow-up (2026-10-09)

Completed:
- Replaced obsolete IPC contracts with 148 Convex contract checks covering all current data modules, exact function/argument mapping, immutable-field filtering, return values and failures. The header-bar tests now mock the data modules while retaining the Electron external-link mock.
- Added tests for the live connector (delayed subscription, updates, deduplication, disabled/unloaded reads, failure recovery, infinite-page changes and cleanup), structured error translation, field filtering, production URL selection, optimistic ID resolution/render keys and backend session states/retry/sign-out/late callbacks.
- Fixed an unhandled derived promise rejection when an optimistic beverage create fails without a waiting edit. Waiting edits still receive the original failure.
- Removed `@convex-dev/react-query` and the obsolete `/login` route. Kept sidebar Sign out; the footer can wrap and its action group does not shrink. No auto-updater code was changed. Visual verification alongside updater states remains part of desktop testing.
- Added `npm run convex:worktree`: configures this linked worktree's local deployment, bootstraps the required WorkOS client ID before auth-config evaluation, enables its internal seed and inserts two synthetic events and 65 contacts for paging. It refuses the main checkout and verifies local deployment/loopback selection before writes. Seed checks and inserts are atomic; repeat setup preserves existing records.
- `npm run dev` now verifies the checkout's deployment and starts Convex before Vite/Electron using `convex dev --start`. Main requires its cloud dev deployment; linked worktrees require local. `.convex/` is explicitly ignored. The sole auth-test exception is the internal `developmentSeed:seed` mutation; all public functions remain checked.
- This worktree now targets `http://127.0.0.1:3210`, with state under `.convex/local/default`. Local setup and seeding succeeded, and `npm run dev` successfully started Convex, Vite and Electron. The contacts index-access fix is present on this local deployment.
- Setup testing found that commands launched by Convex `--start` inherited the old cloud deployment selection. Fixed by passing an explicit `--env-file` on setup commands. The first attempt wrote the existing WorkOS client ID and a temporary seed-enable flag to cloud dev; the seed call failed before any sample data was inserted. Removed the cloud seed flag and reran setup successfully against local. CLI codegen was also run before selection changed; do not assume codegen is offline even when its help text says it does not modify deployed code.

Verification:
- `npm test`: 163 files, 1,258 tests passed.
- `npm run build`, app/Convex/script typechecks, and `npm run lint` passed (the same seven existing warnings). `git diff --check` passed.
- Browser preview renders the signed-out gate. Its `window.api.auth` and Electron bridge are absent, so it cannot exercise the desktop sign-in flow. No authenticated UI smoke checks are claimed.

**Human handoff — stopped as requested.** A real company sign-in in Electron, or an automation-capable desktop session with that sign-in, is required to continue. The current collaborative browser cannot access Electron's auth bridge, and no company session was available to the agent. The pending WorkOS Google-only dashboard configuration from the earlier handoff also remains unverified.

Next, after that blocker is resolved:
1. Confirm company sign-in reaches ready (`users.store` succeeds), wrong-company accounts are rejected, and sign-out clears data.
2. Smoke test create/edit/delete in every section; beverage add-then-type and focus preservation; first cart/tournament open; contact paging; and two authenticated windows updating each other. Check sidebar Sign out alongside updater states without modifying updater code.
3. Remove redundant refresh/invalidation calls once live behavior is verified.
4. Decide audit fields and the final concurrent-edit policy, then implement/test SQLite export/import with ID and foreign-key mapping and verify migrated data integrity.
5. Configure production Convex and WorkOS/build settings; remove remaining SQLite use only after migration verification, then finish Windows packaging and distribution.

### Desktop connection follow-up (2026-10-09)

The latest human smoke test reached the sign-in wall, opened the system browser, and signed in with a `westlinks.ca` account, but Electron remained at **Connecting**.

Findings and fixes:
- At inspection, Vite and Electron were orphaned processes and no local Convex backend was listening on port 3210. This explains a connection that cannot complete; it does not yet prove that the live WorkOS token is accepted when the backend is available.
- The real shutdown check reproduced the cause: Convex's `dev --start` launches the frontend command in a detached process group. Stopping Convex left Vite and Electron running.
- `scripts/convex-worktree.ts` now supervises `npm-run-all` in one process group, with Convex, Vite and Electron as sibling tasks. `package.json` adds `dev:convex` with an explicit `.env.local` selection. Existing deployment-isolation checks remain in place. Services start together; the session gate waits for backend authorization before showing app data.
- `src/lib/data/session.ts` now limits initial connection/user registration to 15 seconds, shows an actionable error with the existing retry/sign-out actions, handles token-fetch failures, and clears auth/timers when an attempt ends. A late successful response can recover the same attempt; callbacks from an abandoned attempt cannot unlock the app.
- Extended `session.test.tsx` for an unreachable backend, stalled registration, retry, token failure and unmount cleanup. Extended `scripts/convex-worktree.test.ts` with real subprocess checks for signal shutdown and backend exit, including descendant cleanup.

Verification:
- The actual `npm run dev` started the isolated local Convex backend, uploaded functions, served Vite and launched Electron. The local `/version` endpoint responded successfully.
- Sending SIGTERM to the dev supervisor stopped all three services; no worktree dev processes or listeners on ports 3210/42069 remained. The original orphaned server was also stopped. **No dev server is left running.**
- Targeted regression tests passed (13 tests). `npm test` passed (163 files, 1,264 tests); build, script typecheck and lint passed (seven existing warnings). `git diff --check` passed.

**Human handoff — stopped as requested.** The shared browser is available but cannot access Electron's authentication bridge. A real desktop sign-in and authenticated UI verification are still required. Run `npm run dev` from this worktree in your own terminal, wait for **Convex functions ready**, and sign in with the company account. Confirm the app opens. If it fails, report the exact message now shown after at most 15 seconds and any Convex terminal error. The Google-only WorkOS dashboard settings remain unverified; no WorkOS settings were changed in this follow-up.

Next:
1. Confirm company sign-in reaches the app, wrong-company sign-in is refused, and sign-out removes access and cached data.
2. Test all sections and two authenticated desktop windows using the smoke-test checklist above.
3. Once live updates are verified, remove redundant refresh/invalidation calls.
4. Obtain the audit-field/concurrent-edit decisions, then implement and verify SQLite migration with legacy-ID/foreign-key mapping.
5. Configure production, retire SQLite after migration verification, and finish Windows packaging/distribution.

### Successful sign-in and sign-out cleanup follow-up (2026-10-09)

Human result: company sign-in reaches the app successfully. Signing out produced Convex unauthenticated errors in the development console. Wrong-company rejection and authenticated section/two-client smoke testing have not yet been verified.

Findings and changes:
- Session teardown previously cleared Convex auth before clearing the React Query cache. Active live watches could therefore rerun without authentication; their error callbacks could also request refetches. This is consistent with the reported console errors, but the exact desktop errors were not captured here.
- `src/lib/data/session.ts` now clears the cache first, synchronously removing live subscriptions through the existing connector, then clears auth. The same ordering applies on retry and unmount. The hook also returns signed-out immediately when the WorkOS state becomes signed-out, so the gate hides protected content before effect cleanup.
- Added regression checks in `session.test.tsx` that connect the real live-query bridge to a fake watch client and verify private watches have unsubscribed and cached data is gone when auth is cleared on sign-out, retry, and unmount. No new abstractions, dependencies, schema changes, or auth-provider settings were needed.

Verification: session/live-query tests passed (16 tests); `npm run build` and `npm run lint` passed (seven existing warnings). The shared preview renders the signed-out screen and confirms `window.api.auth` is absent. Desktop elimination of the reported console errors still needs human verification.

**Human handoff — stopped as requested.** Keep `npm run dev` running in this worktree and wait for **Convex functions ready**. Use synthetic development data for these checks:
1. Sign in, open several sections to establish subscriptions, then sign out. Confirm the sign-in screen appears, event/contact data disappears, and no new unauthenticated query errors appear. Sign in again and confirm data loads. If errors persist, report the exact Convex function name and console message; an operation already in flight may still be rejected at sign-out.
2. Create/edit/delete a sample event and check overview/client details/internal notes, event contacts, touchpoints, setup notes/timeblocks, food items, beverages/assignments, charges, payments, carts and tournament details. Check previews/PDF output. Add a beverage and immediately type into its name; focus and typed text should survive saving. Open cart/tournament sections on a new event. Load multiple contact pages, edit a contact, and filter the directory.
3. With the dev stack already running, launch a second desktop client from this same worktree using `npm run dev:electron` in another terminal. Sign in to both clients and open the same sample event/contact list. Make changes in each direction; confirm the other client updates without navigation or refresh, including contact edits across loaded pages. Both clients must use this worktree's local deployment; another worktree intentionally has a different database.
4. Check sidebar Sign out alongside updater states and verify wrong-company sign-in is refused. Google-only WorkOS dashboard configuration remains unverified.

Next after this handoff:
- Remove redundant mutation refreshes/invalidations after live updates pass the desktop checks; retain contact-page refetches needed for pagination consistency.
- Obtain the audit/concurrency decision before schema or mutation changes. Proposed starting point for review: record creator, last editor and edit timestamp on editable business records; merge edits to different fields and let the last accepted write win for the same field. Confirm whether critical financial/status fields need conflict rejection and whether a full change history is required.
- Implement/test SQLite export/import with legacy-ID and foreign-key mapping, then verify migrated record counts, relationships and representative previews before retiring SQLite.
- Configure production Convex/WorkOS/build settings and complete Windows packaging, installation and update testing.

### Event-create smoke-test fix (2026-10-09)

Human smoke testing found `eventContacts:getPrimaryClients` rejecting `temp_1791575767936` in its `eventIds` argument during event creation. The event saved and opened successfully. The calendar's optimistic event row was included in the batch contact lookup before Convex returned its real ID.

- `usePrimaryClients` now excludes the existing `temp_` event IDs before building the query key, fetch arguments and live subscription source. Existing events remain queried; an all-temporary list stays disabled. Once the saved event ID appears, its clients are fetched normally.
- Reused the existing query factory and optimistic event-ID convention. No new abstractions, dependencies or backend/schema changes.
- Added regression tests for mixed saved/temporary events, live-source arguments, the saved-ID transition, all-temporary lists and optimistic rollback. Event/contact hook tests passed (25 tests).

**Human handoff:** repeat event creation in the calendar/table and confirm no `getPrimaryClients` validation error occurs; if creating with a client, confirm its name appears after saving. Continue the section and two-client checklist above. Redundant refresh removal, audit/concurrency decisions, migration and production/Windows work remain pending that verification.

### Redundant refresh removal (2026-10-09)

**Status: implemented and unit-tested; desktop check pending.** Saves no longer trigger refetches. Convex subscriptions are the only way the cache learns about saved changes, whether they're yours or someone else's.

What changed:
- `src/lib/data/liveQueries.ts` now reconciles optimistic edits itself:
  - While any mutation is in flight, new live results for single-query reads are held back, so they can't overwrite optimistic edits. This happened before when another user's change, or your own earlier save, arrived mid-edit.
  - When the last in-flight mutation settles, every live read is set to Convex's local copy, and only reads that differ are written. Convex applies a mutation's effects to its local query results before the mutation's promise resolves (checked in the client source), so that copy already includes the save. No network round trip is needed.
  - This also fixes two cases a plain subscription misses. If the server normalizes an optimistic value back to what it already had (e.g. trimming), Convex reports no change. If a failed save's rollback snapshot is stale, the rollback could leave old data behind. In both cases the cache now ends up matching the server.
- Removed every post-save `invalidateQueries` from the hooks: events, event detail, payments, charges, touchpoints, cart, tournament, timeblocks, food, beverages, conversion, event contacts and the contact directory. Also removed the ICS import's post-commit refetch (and the hook's now-unused `eventsHook` parameter), plus the unused scope-invalidation helpers in `eventsCache.ts`.
- Kept: every manual **Retry** button (`refetch`), the contact directory's refetch-all-pages-on-change (pagination consistency), and the bridge's refetch when a live query fails (so errors reach the UI translated).
- Tests: two new bridge tests check that a mid-save live result is held and the merged server copy is applied afterwards, without refetching. They also check that a normalized or rejected optimistic value is corrected when no new result arrives. The hook tests that asserted invalidations now assert that the optimistic result stays and nothing is refetched.

Verification: `npm test` 163 files, 1,265 tests passed; typecheck and `npm run lint` passed (the same seven existing warnings).

**Human check:** with `npm run dev` and two signed-in windows, edit fields quickly in a few sections (event title/status, a payment amount, a beverage name right after adding it, a timeblock time). Values should not flicker back while typing, and the other window should update. Change an event's date and confirm it moves between calendar months in both windows.

### Audit fields and simultaneous edits: findings and recommendation (2026-10-09)

**Status: decided and implemented (see "Audit fields and changed-only saves" below).** Decisions: last save wins everywhere (no conflict warnings), and last editor only plus scheduled Convex backups (no change history yet). The findings below are kept for context.

Already decided (from the request):
- Store who created each record, who last edited it, and when.
- Edits to different fields coexist; for the same field, the last saved edit wins.

What the code does today:
- Convex patches only the fields they're sent, so the server already supports "different fields coexist".
- **Several forms send every field on save, not just the changed ones.** Two people editing different fields in these forms would still overwrite each other with stale values. The forms are the calendar sidebar's edit-event form (`EditEventSidebarForm.tsx`: title, type, status, dates and guests), the contact directory's edit form (`ContactEditForm.tsx`), and the event-contact edit form (`EditEventContactForm.tsx`: contact plus assignment). These forms need to send only the fields that changed since the form was opened.
- `EditEventSidebarForm` resets its draft whenever the event object changes. With live updates, another person's save would wipe whatever you're typing. The draft should only reset when a different event is opened.
- Inline autosave fields (event detail title bar, section editors) already send single fields.
- Records with `createdAt`/`updatedAt` today: events, cart/tournament details, timeblocks, contacts and event contacts. Payments, touchpoints, charges and contact roles have only `createdAt`. Food items, beverage items, beverage links and vendor categories have neither.

Planned implementation (once the questions below are answered):
- Add `createdBy`, `updatedBy` (references to `users`) and `updatedAt` to every editable business record. `requireCompanyUser` already gives each mutation the caller's identity, and `users.store` gives the ID. Set them server-side only, never from client input. The SQLite import fills `createdBy`/`updatedBy` with null (unknown) and keeps the original timestamps. Show "Last edited by X, time" where it's useful (event header, contact detail).
- Make the three forms above send changed fields only, and stop resetting drafts on live updates.
- Tests: audit fields set on create and update, not client-settable, and preserved by the import. Plus form diff logic.

**Decision 1: conflict warnings for financial and status fields.**
- *Option A, no warnings (last save wins everywhere).* Simplest. The risk is narrow: two people changing the **same** payment amount or event status within the same few seconds. With 5–6 users and records that usually have one owner, that's rare. Live updates also mean you normally see the other person's value before you edit.
- *Option B, warn on stale saves for selected fields.* The client sends the `updatedAt` it last saw. If the server's copy changed since then, the mutation is rejected and the UI shows "X changed this to Y. Overwrite?". This touches payments, charges, event status and dates (the fields that drive money and the calendar). It costs a version check in each of those mutations and a conflict dialog in their editors.
- **Recommendation: A for now, with the audit fields visible.** The "last edited by" display makes an overwrite noticeable and traceable. B can be added later per field without schema changes, because `updatedAt` is already stored. Revisit if an overwrite actually happens.

**Decision 2: full edit history.**
- *Option A, last editor only (the audit fields above).*
- *Option B, an append-only `changes` table:* record, field, old value, new value, user, time. One entry is written by each mutation, and each record gets a viewable history. It's a moderate amount of work: a shared helper called by about 30 mutations, a history panel, and storage that grows forever (small at this scale).
- *Option C, rely on Convex backups / snapshot exports* for "what did this look like last week". These are coarse and must be restored manually.
- **Recommendation: A now, plus scheduled Convex backups (C) for disaster recovery.** Add B later if you find you need to answer "who changed this payment and from what?". If financial disputes are a real possibility, B for payments and charges only is a cheap middle ground.

### Audit fields and changed-only saves (2026-10-09)

**Status: implemented and tested; desktop check pending.** Decisions from you: last save wins everywhere, and last editor only (plus scheduled Convex backups) for now. A full change log is a possible future feature, and the structure below leaves room for it.

Server (`convex/`):
- `lib/audit.ts`: `companyMutation` now passes every handler a database writer that stamps `createdBy`/`updatedBy` (the caller's `users` ID) on each insert, patch and replace to an audited table. Mutations don't set these fields themselves, so none can forget, and no mutation accepts them as input.
  - Audited: every business table. Not audited: `beverageItemTimeblocks` (link rows) and `users`. A test fails if a new table is added to the schema without being classified.
  - Tables that had no `updatedAt` (payments, touchpoints, charges, food, beverages, vendor categories, contact roles) now get an ISO `updatedAt` from the wrapper. The others keep setting their own, in the format they already use (Unix ms string for events and timeblocks, ISO elsewhere).
  - The wrapper refuses the id-only `patch`/`replace` forms and `db.table()`, because it can't tell which table those write to.
  - **Future change log:** every audited write already passes through `auditedWriter`. A change log can be added there (read the old document in `patch`, write a `changes` row) without touching the ~30 mutations.
- `companyMutation` creates or refreshes the caller's `users` row (`lib/users.ts`) before the handler runs, so writes can be attributed even if `users.store` hasn't run yet. `users.store` is now just that step. New `users.list` returns every account's ID, name and email for display.
- Schema: `createdBy`/`updatedBy` (`v.optional(v.id("users"))`) on audited tables, plus optional `updatedAt` on the tables listed above. They are optional, so existing local/dev documents still validate and the SQLite import can leave them absent (unknown author). No SQLite schema change; the SQLite conformance check ignores the Convex-only audit fields.
- Edits that set no fields (`contacts.update` with `{}`, or the contact or assignment half of `eventContacts.updateWithContact`) are now skipped, so they don't make you the record's last editor.

Renderer:
- `src/hooks/useLiveDraft.ts`: `useLiveDraft` keeps the user's edits on top of the live record. Fields you've typed in keep your value; untouched fields show other people's changes as they arrive. `changedFields` diffs the form's payload against the live record's payload, so Save sends only the fields you actually changed. If nothing changed, the form closes without saving.
- Used by the three forms that previously sent every field:
  - `EditEventSidebarForm`: no longer resets its draft when the event updates; the draft resets only when a different event is opened (an inner component keyed by event ID).
  - `ContactEditForm`
  - `EditEventContactForm`: `ContactsList` now passes the row as currently cached, so its assignment fields follow live updates too.
- "Last edited by X · time" (`src/components/molecules/LastEditedBy.tsx`, logic in `src/lib/audit/lastEdited.ts`) appears in the event detail header and under the contact name in the directory. It shows nothing when the editor is unknown, e.g. on imported records. It reflects edits to the event or contact record itself; edits to an event's sections stamp those section records, not the event.
- `Event` and `Contact` types gain optional `createdBy`/`updatedBy`. Other records carry the fields at runtime, but their types don't declare them until something displays them.

Tests: `convex/audit.test.ts` (8 tests): table coverage, creator/editor attribution across two users without `users.store`, updatedAt stamping, stamping inside shared helpers, rejection of client-sent audit fields, unaudited link rows, refusal of untyped writes, empty-patch no-ops, and `users.list`. Also: `useLiveDraft` and `changedFields` tests; changed-only, no-op and live-update tests for all three forms; `lastEdited` parsing and formatting tests; the header display; and data contracts for `users.list` and audit-field filtering. Five existing timestamp assertions now allow the stamped `updatedAt`.

Verification: `npm test` 168 files, 1,300 tests passed. Convex typecheck, `npm run build` and `npm run lint` passed (the same seven existing warnings). `git diff --check` passed. The schema change isn't deployed yet; `npm run dev` in this worktree pushes it to the local deployment.

**Human check (with the two-window test):** edit different fields of the same event in the calendar sidebar in each window, then save both. Both changes should survive. While typing in an edit form, a save from the other window should update the untouched fields and leave your typing alone. The event header and contact page should show "Last edited by <you>" after a save.

### SQLite → Convex migration (2026-10-09)

**Status: implemented, tested, and rehearsed with the installed app's data in a throwaway deployment. Not run against any shared deployment.**

How it works:
- `convex/lib/legacyImport.ts` (pure, shared by the CLI and tests) maps every SQLite table and column to its Convex table and field. It converts 0/1 booleans (`rentingCarts`, `isPrimary`) and the JSON `customGrid`, and keeps each row's UUID as `legacyId`. Tables are inserted parents-first. Every reference (`eventId`, `timeblockId`, `contactId`, `vendorCategoryId`, `beverageItemId`) is rewritten through a legacy-ID → Convex-ID map. Imported records keep their original timestamps and have no `createdBy`/`updatedBy` (author unknown).
- Before writing, it checks that every reference in the SQLite data resolves and that the target deployment has no data (users excepted). The Convex schema validates every inserted document.
- `convex/legacyImport.ts` holds four **internal** functions (`nonEmptyTables`, `insertBatch`, `deletePage`, `dump`), callable only with the deployment's admin access. `insertBatch` and `deletePage` also require `EVENT_HORIZON_LEGACY_IMPORT=enabled`, which the CLI sets for the run and then removes. A compile-time check fails if a schema table is missing from the import. `convex/auth.test.ts` lists these as the only internal functions besides the seed.
- If any insert fails, the import rolls back by emptying the business tables (children first), so a retry starts from an empty deployment. This also covers a batch that committed but whose CLI call failed. If the rollback fails, or the script is killed, `--reset --target <t>` does the same by hand. Both refuse, before deleting anything, if any document has `createdBy` or `updatedBy` (created or edited in the app rather than imported). While `EVENT_HORIZON_LEGACY_IMPORT` is set (for the whole import or reset), `companyMutation` refuses app writes with `ImportInProgress` (`users.store` is exempt), so nothing can be edited between the check and the deletes. `deletePage` also repeats the check in the same transaction as its deletes, as a backstop.
- After importing, verification reads every table back and compares counts, a one-to-one legacy-ID mapping, every field value, and every reference (link rows are compared as a set).
- CLI: `npm run legacy-import -- --sqlite <path> --dry-run` (read-only) or `--target local|dev|prod`, or `--reset --target local|dev|prod` to empty a partially imported deployment. The target must match the checkout's `.env.local`. `local` needs a local deployment; `dev` and `prod` must run from the main checkout (`prod` adds `--prod`). The SQLite file is opened read-only, inside one read transaction. The ID map is saved under `.event-horizon/legacy-import/` (git-ignored). The script exits non-zero on any mismatch. The npm script rebuilds better-sqlite3 for Node first.

Tests:
- `convex/legacyImport.test.ts` (21): column coverage against the Convex schema, parent-first order, SQL aliasing, conversions, broken references, batching, a full import with verification, imported data through the app's own queries, refusals (non-empty target, broken references, import disabled, schema-invalid rows), verification catching changed fields, missing rows and changed links, and recovery: rollback after a failed (or committed-then-failed) batch followed by a clean retry, the `--reset` path, refusing to clear app-created or app-edited data, and refusing app writes while the import flag is on.
- `scripts/legacy-import.test.ts` (6): reads a database built by the real SQLite migrations (every table, the generated `email_normalized`, the seeded vendor categories), plus option parsing, target selection and the report.

Rehearsal: run against the installed app's `~/Library/Application Support/Event Horizon/app.sqlite`.
- A read-only dry run gave 3 events, 6 contacts, 8 vendor categories, 1 tournament, 1 cart, 4 payments, 11 touchpoints, 6 charges, 14 timeblocks, 4 food items, 12 beverage items, 12 beverage links, 6 contact roles and 6 event contacts. All references resolve.
- A copy was then imported into a throwaway anonymous local deployment in a temp directory. Verification passed for every table, row, field and reference. A second run was refused, and the import flag was removed afterwards.
- The app's timeline, contacts-panel and beverage queries returned every imported event.
- The temp directory (including the copy and the ID map) was deleted, and no backend was left running.
- The real SQLite file, the cloud dev deployment and production were not written to.

Verification: `npm test` 170 files, 1,319 tests passed. Convex and script typechecks, `npm run build` and `npm run lint` passed (the same seven existing warnings).

Not yet done:
- A visual spot-check of migrated events and their PDFs (estimate/BEO/timeline) in the app.
- The real import into production. Production isn't set up yet (Convex prod, WorkOS production, Google OAuth). Follow the checklist in `docs/PRODUCTION_SETUP.md`. Phase 1 is done: the redirect is now `http://127.0.0.1:42070/callback`, and packaged builds use the production WorkOS client ID.

### Production-copy rehearsal (2026-10-10)

**Status: rehearsed against a copy of the production database. Every row, field and reference was verified. The copy is loaded into this worktree's local deployment for a human visual check.**

- Source: a copy of `~/Documents/Coding/app.sqlite`, which is itself a copy of production. Its rows were 68 events, 96 contacts, 8 vendor categories, 19 tournaments, 19 carts, 25 payments, 60 touchpoints, 57 charges, 260 timeblocks, 115 food items, 63 beverage items, 41 beverage links, 108 contact roles and 108 event contacts. The original file was not modified, and its hash was unchanged afterwards.
- The first attempt failed at `foodItems`. The dry run had passed, but 4 `food_items` rows had `service_style = ''`, which the schema rejects. In the old app, the "Select..." option of two service-style dropdowns stored an empty string, meaning "not set".
- Fix: `emptyAsNull` in the table specs turns `''` into null for food and beverage `serviceStyle`. Null is kept rather than defaulting to Buffet, so the migrated data stays faithful. The dry run and every real run now also check each converted row against the Convex schema validators before writing. The check is `convex/lib/schemaCheck.ts`, loaded by the CLI through `loadSchema`. It lists all problems up front instead of failing mid-batch.
- The same `''` bug existed in the Convex app itself: choosing "Select..." in `GenericItemCard` or `PlanningTimeblockItemRow` made the save fail. `pickItemFields` in `src/lib/data/backend.ts` now converts `''` to null for food and beverage creates and updates.
- Re-run result: the import into a fresh local deployment verified clean for all 14 tables. A second run was refused (target not empty), and the import flag was removed afterwards.
- Worktree state:
  - `.env.local` now selects `local:local-jboddy07-event_horizon-1`, which holds the imported data.
  - The previous seeded database is in `.convex/local/default.seeded-backup-2026-10-10`, and its deployment name was `local-jboddy07-event_horizon`.
  - To restore it: stop dev, swap the directories back, and restore the `CONVEX_DEPLOYMENT` line.
- Verification: `npm test` 170 files, 1,342 tests passed. Lint, the app, Convex and script typechecks passed.

### Notes for the Step 2 detailed plan (found during Step 1)
- Live updates: use the custom connector in `src/lib/data/liveQueries.ts`, preserving the existing key hierarchy. The unused `@convex-dev/react-query` adapter has been removed.
- Cart details and tournament details are created on first read (`getOrCreate…`). Convex queries can't write, so these become "create with the event" or an explicit mutation.
- The contacts directory uses cursor pagination (`useInfiniteQuery`); map it to Convex's paginated queries.
- Some creates accept a client-generated `id` for optimistic updates (beverage items). The Convex port drops client IDs; renderer integration must reconcile optimistic records with returned IDs before further mutations.
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
