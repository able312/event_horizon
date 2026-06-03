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
  - Calls only `window.api.*` methods exposed by preload.
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

## Known Issues / Current Risks

- docs/TASKS.md will have know issue tickets

## Error Handling Standard

- Follow the canonical architecture in `docs/ERROR_HANDLING_ARCHITECTURE.md`.
- New routes/features must implement blocking data guards, route-level boundaries, and retry/test coverage per that checklist.
