# Event Horizon

Event Horizon is an in-house desktop application for managing venue events from initial intake through planning and document output. It is an Electron app with a React renderer and a shared Convex database, so the whole venue team works from the same live data: estimates, BEOs, timelines, payments, and scheduling details.

## Why This Project Exists

This project exists to replace scattered event information spread across notes, ad hoc documents, and manual coordination. The goal is to keep the full operational picture for an event in one place: the event record itself, its schedule, linked planning details, financial entries, and exportable staff-facing documents.

It is intentionally optimized for reliability, speed, and daily usability for a small venue team. Everyone signs in with a company Google account and sees the same data, with changes appearing live in every open app.

## What It Does

- Creates and manages event records for venue operations
- Tracks event lifecycle and status progression
- Stores client and contact information
- Manages timeblocks and operational detail sections attached to the event timeline
- Tracks payments and charge items
- Generates estimate, BEO, and timeline preview/export flows
- Supports calendar-related event import and commit flows

## Architecture Highlights

Event Horizon is structured as a desktop app with explicit boundaries between UI, privileged Electron code, and the backend.

- Renderer: React + Vite SPA with feature-oriented UI modules
- Preload: a constrained `contextBridge` layer exposing allowlisted IPC methods only
- Main process: Electron window lifecycle, app menu actions, IPC handler registration, filesystem/OS access, sign-in and auto-update. It has no database access.
- Data layer: Convex queries and mutations in `convex/`, called by the renderer only through `src/lib/data`. Cached reads stay subscribed, so other people's edits arrive without a refresh.
- Auth: WorkOS AuthKit with Google sign-in. Every Convex function rejects callers who aren't signed in with a `westlinks.ca` account.
- Deployments: installed builds use the Convex production deployment; the main checkout uses the cloud dev deployment; every other worktree runs its own local deployment, so branch work can't touch shared data

The security and reliability baseline is also deliberate:

- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- allowlisted IPC channels instead of a generic passthrough bridge
- auth and the company email domain enforced server-side in Convex
- no secrets in the app: the WorkOS client ID and Convex URL are public, and sign-in uses PKCE

## Tech Stack

- Node 22
- Electron
- React 19
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI
- TanStack Query
- Convex
- WorkOS AuthKit
- Vitest

## Project Structure

```text
convex/
src/
  electron/
  features/
  lib/
  routes/
docs/
scripts/
```

- `convex/` contains the database schema and the queries and mutations the app calls, with their auth checks
- `src/electron/preload.cts` exposes the allowlisted renderer API through `contextBridge`
- `src/electron/main.ts` bootstraps Electron, sets up sign-in and the updater, creates the main window, and rebuilds the app menu
- `src/electron/ipcRoutes/` contains IPC handlers for PDF saving, external links, sign-in and updates
- `src/electron/services/` contains sign-in (WorkOS), auto-update and ICS parsing
- `src/features/` contains higher-level renderer features such as calendar and event detail workflows
- `src/lib/data/` is the only renderer code that talks to Convex
- `src/lib/ipc/` contains the frontend-side IPC callers used by the renderer for Electron features
- `src/routes/previews/` contains preview routes for generated event documents such as estimates and timelines
- `docs/PROJECT.md` documents the broader technical context and project goals
- `docs/PRODUCTION_SETUP.md` records how production (Convex, WorkOS, Google sign-in) was set up

## Local Development

### Requirements

- Node.js 22
- npm

### Start the app

```bash
npm install
npm run dev
```

`npm run dev` does three important things:

- checks which Convex deployment this checkout points at (the cloud dev deployment in the main checkout, a local one in any other worktree) and starts it
- starts the Vite dev server on port `42069`
- transpiles and launches the Electron process

In a new worktree, run `npm run convex:worktree` once first. It sets up the worktree's own local Convex deployment and fills it with sample events and contacts. Its data lives in the ignored `.convex/local/default` folder; to reset it, stop the app and delete that folder, then run the setup again.

Signing in during development uses the WorkOS sandbox environment and a company Google account.

## Useful Scripts

- `npm run dev` starts Convex, Vite and Electron for local development
- `npm run convex:worktree` sets up and seeds a worktree's local Convex deployment
- `npm run build` type-checks Electron, builds the TypeScript project, and creates the renderer build
- `npm run test` runs the Vitest suite (app and Convex functions)
- `npm run lint` runs ESLint across the repo
- `npm run dist:mac` creates a macOS distribution build
- `npm run dist:win` creates a Windows distribution build
- `npm run release` builds, verifies and uploads a draft GitHub release; `npm run release:publish` publishes it

## Data Model Overview

The schema (`convex/schema.ts`) centers on `events`, which acts as the root record for venue work. Each event stores core details such as title, type, status, schedule, client information, guest counts, notes, and tracking metadata.

The main operational spine is `timeblocks`. Timeblocks represent timeline entries and bridge event-level planning to attached detail sections. That structure allows timeline-driven organization without flattening every event concern into a single table.

Supporting tables store more specialized event data, including:

- `payments`
- `menuOfChargeItems`
- `tournamentDetails`
- `cartDetails`
- `foodItems`
- `beverageItems`
- `touchpoints`
- `contacts`, `contactRoles`, `eventContacts` and `vendorCategories`
- `users`, for recording who created and last edited each record

This model keeps the event record central while allowing operational detail to expand in focused tables rather than a single overloaded structure.

## Design Decisions

- Shared hosted backend: the team needs one source of truth with live updates, so data lives in Convex. Authorization is plain TypeScript in each function rather than database policies
- One data boundary: only `src/lib/data` talks to Convex, so hooks and components don't depend on the backend and it could be swapped in one place
- Explicit IPC contracts: the renderer talks to the main process through named, allowlisted IPC routes rather than a generic bridge, which keeps the trust boundary clear
- Feature-oriented renderer structure: renderer code is grouped around workflows such as calendar views and event detail management rather than only by technical layer
- Preview-driven document output: estimate, BEO, and timeline generation are part of the application flow rather than treated as an external reporting system

## Testing And Quality

This repo already includes automated tests with Vitest, plus linting and build/typecheck steps in the normal workflow. The current setup is aimed at catching regressions in key data and UI behavior without claiming exhaustive coverage.

For routine verification:

- run `npm run lint`
- run `npm run test`
- run `npm run build`

## Notes

Event Horizon is actively used as a practical internal tool, and the repo doubles as a case study in building a collaborative operational desktop application with explicit process boundaries, typed IPC, and a shared reactive backend.
