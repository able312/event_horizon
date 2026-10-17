# PROJECTS.md — Project Context

## Project Summary

- Name: Event Horizon
- What it does:
  - An in-house event ops tool to track all details about events we host at our venue.
  - Event creation → multi-day phased status process → track event status, deposits, all details → generate PDFs (Estimate/BEO/Timeline) for staff access.
- Primary user(s):
  - The venue team (5–6 people: 4 on Windows, 1 on macOS). Everyone with a company account sees and edits the same data.
- Operating mode:
  - Desktop app (Electron) backed by a shared, hosted Convex database with live updates across clients.
  - Sign-in through WorkOS AuthKit with Google; only `westlinks.ca` accounts are allowed.
  - Online only. There is no offline mode or local copy of the data.

## Goals

- Daily-use reliability: app boots quickly, strong UI/UX that is fast and easy to use, core flows don’t break.
- Data integrity: no silent data loss; schema changes are safe for existing data; backups are possible.
- Reasonable security baseline: safe-by-default Electron settings and constrained IPC.
- Maintainability: clear boundaries (renderer/preload/main/db) and predictable patterns.

## Non-Goals

- Per-user permissions (any company account can read and edit everything)
- Offline use
- Enterprise-grade threat model
- Perfect UI polish
- Import / Export functionality (beyond PDF generation flow already implemented)

## Instructions for writing code. !IMPORTANT

1. Inspect the existing files and identify any helpers, hooks, components, reducers, or utilities that already solve part of this.
2. Reuse existing patterns where possible.
3. Do not create new helpers unless there is no appropriate existing place.
4. If new logic is needed, put it in the smallest sensible module:
   - UI-only logic stays near the component
   - shared logic goes in /lib, /utils, or /features/[feature]
   - state transitions go in reducers/actions
   - reusable React logic goes in hooks
5. Prefer encapsulated logic files over writing large logic functions in component files.
6. Prefer smaller, focused & encapsulated copmonents over large components that handle multiple functions.
7. Prefer well thought out, named functions over inline complex logic.
8. Keep components focused on rendering and orchestration.
9. After the change, list:
   - files changed
   - new abstractions created and why
   - existing code reused
   - any cleanup opportunities

## Release Definition

- “Release” means: I can use it daily without data loss or major friction.
- Public GitHub release is secondary, but changes should not introduce obvious
  security foot-guns for other developers running it.

## Threat Model

Assumptions:

- Data lives in a hosted Convex deployment shared by the team. Anyone with a `westlinks.ca` Google account can sign in.
- The renderer should be treated as _untrusted_ compared to the main process in order to gaurd the privilege boundary.
- The renderer calls Convex directly. Convex functions never trust the client: each one checks for a signed-in company identity before touching data.
- No remote content is loaded into the window. The renderer is bundled with the app; only Convex and WorkOS are contacted over the network.
- One HTTP route runs without a signed-in user: `POST /event-requests` (`convex/http.ts`), which receives website event requests from the Google Form's Apps Script. It requires the `EVENT_REQUEST_SECRET` deployment env var as a bearer token (each deployment has its own; without one the route refuses everything), validates every field (`convex/lib/eventRequestPayload.ts`), and can only insert a pending request.
- The caller is an Apps Script bound to the form's response Sheet (reference copy: `docs/apps-script/eventRequestIntake.gs`), owned by the shared company account. It keeps the URL, secret and team addresses in Script Properties, so anyone with edit access to that Sheet or script can read the secret; keep that list short. The client's confirmation email repeats only their first name and the form-constrained answers, so the form can't be used to send arbitrary text from the venue's account.

Security priorities:

- Enforce sign-in and the company email domain server-side in every Convex function (`convex/lib/auth.ts`), not only in WorkOS.
- Prevent arbitrary IPC channel access from renderer.
- Avoid disabling Electron/Chromium security features unless justified.
- Validate inputs crossing trust boundaries (renderer → main → filesystem / OS, renderer → Convex).
- No secrets ship with the app. The WorkOS client ID and Convex URL are public; sign-in is a PKCE flow, and the session is stored encrypted with Electron `safeStorage`.

## Tech Stack

### Frontend (Renderer)

- React + Vite SPA
- TailwindCSS
- shadcn/ui (Radix)
- React Query

### Desktop Shell

- Electron
  - Main process: window lifecycle, IPC handlers, OS integration
  - Preload: minimal, allowlisted API via `contextBridge`

### Data Layer

- Convex (hosted database, queries and mutations in `convex/`)
- Convex document IDs; the renderer treats them as opaque strings

### Auth

- WorkOS AuthKit, with Google (company Google Workspace) as the only sign-in method
- Convex validates WorkOS access tokens (`convex/auth.config.ts`); the token must carry the user's email

## Architecture Overview (high level)

- Renderer (UI):
  - Reads and writes data only through `src/lib/data` (the backend boundary; see `docs/COLLABORATION_PLAN.md`). Query keys and fetchers live in `src/lib/data/queries.ts`.
  - Uses Electron features only through `src/lib/ipc`.
  - ESLint enforces both boundaries.
  - No direct Node.js access.
- Preload:
  - Exposes explicit API surface (no generic `invoke(channel)` passthrough).
- Main:
  - Owns privileged operations: filesystem (PDF save), OS integration, external linking, the app menu, ICS file parsing, sign-in and auto-update.
  - Implements `ipcMain.handle(...)` allowlisted endpoints. It has no database access.
  - Sign-in: opens the system browser for WorkOS, receives the callback on `http://127.0.0.1:42070/callback`, stores the session and hands access tokens to the renderer (`src/electron/services/auth*.ts`).
- Convex (`convex/`):
  - `schema.ts` defines the tables and indexes. Each public function is a `companyQuery` / `companyMutation` (`convex/lib/auth.ts`), which rejects callers who aren't signed in with a company account.
  - Every write records who created and last edited the record (`convex/lib/audit.ts`).
  - Each mutation runs as one transaction, so multi-step writes belong in a single mutation.
  - `eventRequests` holds website requests waiting for review. They aren't events until someone accepts one; `eventRequests.accept` creates the event and client contact and marks the request in one transaction.

### Deployments

Each environment has its own isolated database, so branch work can't touch shared data:

| Environment | Convex deployment | WorkOS environment |
|---|---|---|
| Installed app | Production (`VITE_CONVEX_PRODUCTION_URL`, set at build time; the app won't connect without it) | Production |
| Main checkout (`npm run dev`) | Cloud dev deployment (`VITE_CONVEX_URL` in `.env.local`) | Event Horizon Dev (sandbox) |
| Other worktrees | A local deployment per worktree (`npm run convex:worktree`, state in `.convex/local/default`), seeded with sample data | Event Horizon Dev (sandbox) |

- `npm run dev` checks which deployment the checkout points at, then starts Convex, Vite and Electron together.
- Production functions are pushed with `npx convex deploy` from the main checkout. Production backups are manual (Convex dashboard → Backups) on the free plan. See `docs/PRODUCTION_SETUP.md`.

## Core Flows

- Create event
- Move through statuses/phases
  - An event without a start date can only be New Lead or Lost; Tentative, Confirmed and Complete need a date (`src/lib/events/eventStatusRules.ts`, enforced in `convex/events.ts`). Removing the date from a dated-status event asks first, then moves it back to New Lead in the same update.
- Receive website requests: a client submits the Google Form on the website. Apps Script emails the team and a confirmation to the client, then POSTs the answers to `POST /event-requests`, recording Synced / Failed / Rejected per response on the Sheet's "Event Horizon sync" tab. Failed responses retry every 15 minutes and the owner is emailed if one keeps failing; Rejected ones (Event Horizon refused the answers, e.g. a non-numeric guest count) alert the owner at once and are not retried. The Sheet keeps every response even if Convex is unreachable.
- Review website requests: the Inbox (`⌘L` / `Ctrl+L`) replaces the sidebar with pending requests and a search. Selecting a request shows everything the client sent in the body; Review (top right) opens the create form pre-filled from the request (`src/features/calendar/lib/eventRequestPrefill.ts`), and saving it accepts the request (a client is required). Dismiss sets it aside, with Undo for 10 seconds (`eventRequests.restore`).
- Desktop request alerts: while signed in, new pending request IDs trigger a native notification; clicking focuses the app and opens the Inbox. Existing requests at startup are silent. The macOS dock badge shows the pending count; Windows flashes the taskbar for new requests while unfocused (cleared on focus or an empty Inbox). The listener runs across all routes, tracks seen IDs for the session, and uses explicit preload methods with sender and argument validation. On macOS, closing the window hides it (`src/electron/windowClose.ts`) so alerts and the badge keep working from the dock; quitting, including an update install, still closes it.
- Attach/track details and their attached timeblocks data
- Generate PDFs (Estimate, BEO, Timeline)
- Confirm persistence across restarts, and that edits appear live in a second signed-in window

## Quality Gates / How to Verify

- Build: `npm run build`
- Lint: `npm run lint`
- Dependencies: `npm audit` & `npm audit --omit=dev`
- Tests: `npm run test`
- Notification smoke test (signed packaged macOS / installed Windows build, with OS notifications allowed):
  - Start with pending requests: badge count appears on macOS, without a startup alert.
  - Leave the app on Contacts, put it in the background, and submit a new dev website request: a native alert appears and Windows flashes its taskbar.
  - Click the alert: the app restores/focuses and opens the Inbox. Windows flashing stops on focus.
  - Dismiss then Undo: badge updates without a second alert. Accept/dismiss all requests or sign out: badge clears.
  - macOS: close the window (also from full screen) and submit a request: the alert and badge still update. Click the dock icon: the same window returns where you left it. ⌘Q quits, and Restart to Update still installs.
- Basic smoke test:
  - Launch app and sign in with a company account
  - [Open main screen, create a record, restart app, confirm record persists]

## Repo Conventions (so agents match your style)

- TypeScript everywhere.
- Prefer small focused modules.
- Avoid adding new dependencies unless needed.
- Aim to remove redundant or bloated dependencies where possible. Always explain your reasoning to remove a dep and ask first.
- When adding IPC:
  - Add handler in main
  - Add explicit method in preload
  - Add types for renderer usage
- When adding data operations:
  - Add the Convex function using `companyQuery` / `companyMutation`
  - Add the renderer call in `src/lib/data` (nothing else imports Convex)
  - Add query keys and live sources in `src/lib/data/queries.ts` / `sources.ts`
- When changing the Convex schema:
  - Production already holds data. Make changes that existing documents still satisfy (e.g. new fields optional), or migrate the data first, and confirm existing data survives.
  - `npx convex deploy` refuses a schema that existing documents don't match.

## Dependency Overrides

`package.json` cannot hold comments, so every entry in `overrides` is recorded here. Re-check each one whenever its parent package is bumped, and delete it once upstream ships a fixed range (`npm audit` stays clean without it).

- `app-builder-lib@26.15.3` → `@electron/get@3.1.0` → `global-agent 4.1.3`
  - Why: `global-agent@3` → `roarr@2` → `sprintf-js` (GHSA-hp3w-g68c-fv3c, moderate DoS). Build-time only (electron-builder downloads Electron with it).
  - Compatibility: `@electron/get` only uses it in `proxy.js` (`require('global-agent').bootstrap()` when `ELECTRON_GET_USE_PROXY` is set). Checked that 3.0.0 and 4.1.3 resolve `GLOBAL_AGENT_HTTP(S)_PROXY`/`NO_PROXY` and install the same proxy agent.
  - Scoped to the exact parent versions, so it stops applying once electron-builder is bumped. If `npm audit` flags it again after a bump, re-verify and update the versions.
  - Remove when: app-builder-lib depends on `@electron/get >=4.0.4` (no global-agent dependency).
- `@tailwindcss/typography` → `postcss-selector-parser 7.1.6`
  - Why: typography 0.5.20 pins `postcss-selector-parser 6.0.10` (GHSA-rj75-hqrm-r3gf, moderate quadratic-parse DoS). Build-time only.
  - Compatibility: the plugin only uses it in `commonTrailingPseudos`, which calls `remove()`/`prepend()` outside any parser iteration, so the 7.0.0 change to mutation during iteration doesn't affect it. Checked that it gives identical output on 6.0.10 and 7.1.6 for prose variant selectors.
  - npm doesn't allow a version-keyed override on a direct dependency, so this one is unscoped and the child version is pinned exactly. Re-check it whenever typography is bumped.
  - Remove when: typography depends on `postcss-selector-parser >=7.1.6`.

## Error Handling Standard

- Follow the canonical architecture in `docs/ERROR_HANDLING_ARCHITECTURE.md`.
- New routes/features must implement blocking data guards, route-level boundaries, and retry/test coverage per that checklist.
