# PROJECTS.md — Project Context

## Project Summary

- Name: Event Horizon
- What it does:
  - A local-only event ops tool to track all details about events we host at our venue.
  - Event creation → multi-day phased status process → track event status, deposits, all details → generate PDFs (Estimate/BEO/Timeline) for staff access.
- Primary user(s):
  - Single user, myselg
- Operating mode:
  - Local-only desktop app (Electron). No hosted backend. Data saved to sqlite database on disk.

## Goals

- Daily-use reliability: app boots quickly, strong UI/UX that is fast and easy to use, core flows don’t break.
- Data integrity: no silent data loss; migrations are safe; backups are possible.
- Reasonable security baseline: safe-by-default Electron settings and constrained IPC.
- Maintainability: clear boundaries (renderer/preload/main/db) and predictable patterns.

## Non-Goals

- Multi-user / accounts / auth
- Cloud sync
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

- The app runs entirely on the user’s machine and stores data locally.
- The renderer should be treated as _untrusted_ compared to the main process in order to gaurd the privilege boundary, even with local-only.
- No remote content is loaded

Security priorities:

- Prevent arbitrary IPC channel access from renderer.
- Avoid disabling Electron/Chromium security features unless justified.
- Validate inputs crossing trust boundaries (renderer → main → DB / filesystem).

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

- SQLite (better-sqlite3)
- drizzle-orm + drizzle-kit
- UUIDs for IDs

## Architecture Overview (high level)

- Renderer (UI):
  - Reads and writes data only through `src/lib/data` (the backend boundary; see `docs/COLLABORATION_PLAN.md`). Query keys and fetchers live in `src/lib/data/queries.ts`.
  - Uses Electron features only through `src/lib/ipc`.
  - ESLint enforces both boundaries.
  - No direct Node.js access.
- Preload:
  - Exposes explicit API surface (no generic `invoke(channel)` passthrough).
- Main:
  - Owns privileged operations: filesystem, OS, DB access, external linking.
  - Implements `ipcMain.handle(...)` allowlisted endpoints.
- Database:
  - Schema migrations managed by drizzle-kit.
  - Prefer transactions for multi-step writes.

## Core Flows

- Create event
- Move through statuses/phases
- Attach/track details and their attached timeblocks data
- Generate PDFs (Estimate, BEO, Timeline)
- Confirm persistence across restarts

## Quality Gates / How to Verify

- Build: `npm run build`
- Lint: `npm run lint`
- Dependencies: `npm audit` & `npm audit --omit=dev`
- Tests: `npm run test`
- Basic smoke test:
  - Launch app
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
- When changing DB schema:
  - Add migration + confirm existing data survives.

## Dependency Overrides

`package.json` cannot hold comments, so every entry in `overrides` is recorded here. Re-check each one whenever its parent package is bumped, and delete it once upstream ships a fixed range (`npm audit` stays clean without it).

- `@esbuild-kit/core-utils` → `esbuild ^0.25.12`
  - Why: the esbuild version that core-utils requests is affected by an esbuild dev-server advisory. Dev-only (via drizzle-kit).
  - Remove when: drizzle-kit no longer pulls in `@esbuild-kit/core-utils`, or core-utils depends on `esbuild >=0.25`.
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
