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

**Status: backend operation ports implemented; stopped at human authentication setup (2026-10-08).** The app still uses SQLite through the existing IPC-backed data layer. All used backend operation families now have internal Convex implementations; authentication, renderer integration, and data migration remain pending.

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
- The new functions are **internal** (`internalQuery`/`internalMutation`) while auth is pending, so there is no unauthenticated client API. Before renderer integration, introduce authenticated public functions with the shared company-domain guard from Step 3. Internal visibility is temporary staging, not a substitute for that guard.
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

**Human handoff — stop here before authentication/renderer integration.**
- Confirm the exact company Google Workspace email domain to enforce server-side. No approved domain is recorded in the repo.
- Create/configure the development WorkOS AuthKit application and Google Workspace identity provider, and provide its public client ID and JWT issuer/configuration information. The repo currently contains no WorkOS configuration. Do not put provider secrets into the Electron bundle or commit them. Desktop redirect registration and JWT email-claim verification must be completed with the implemented PKCE flow in the next batch.
- Production Convex/WorkOS setup remains a later rollout prerequisite. Current automated checks do not replace desktop smoke testing or two-client collaboration verification.

Resume after that handoff:
1. Add the shared auth/domain guard and authenticated public functions, WorkOS JWT configuration, Electron system-browser PKCE sign-in with secure token storage/refresh/sign-out, and signed-out renderer state. Add unauthenticated/wrong-domain coverage before exposing any functions.
2. Wire the Convex client and React Query adapter through `src/lib/data`, replace IPC-backed data operations, adapt centralized query factories and contact keyset pagination, and verify live updates across two clients. Replace all-payments filtering with the by-event query and get-or-create detail reads with explicit initialization mutations followed by subscriptions. Pass the client's IANA time zone to timeline reads and touchpoint seeding; reconcile optimistic beverage UUIDs with returned IDs. Translate structured Convex contact errors for existing UI consumers.
3. Complete production setup and audit/concurrency decisions, implement and test SQLite export/import with ID and foreign-key mapping, run migration verification and desktop/two-client collaboration checks, then remove replaced SQLite code and dependencies. Keep the local app and data intact until migration and collaboration are verified.

**Notes for the Step 2 detailed plan (found during Step 1)**
- Live updates: use the installed `@convex-dev/react-query` adapter. Its cache keys differ from ours; adapt the centralized key factories and fetchers in `src/lib/data/queries.ts` during integration.
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
