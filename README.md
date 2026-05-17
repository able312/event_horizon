# Event Horizon

Event Horizon is an in-house desktop application for managing venue events from initial intake through planning and document output. It is a local-first Electron app with a React renderer, a SQLite data layer, and a workflow built around a single user managing real event operations, including estimates, BEOs, timelines, payments, and scheduling details.

## Why This Project Exists

This project exists to replace scattered event information spread across notes, ad hoc documents, and manual coordination. The goal is to keep the full operational picture for an event in one place: the event record itself, its schedule, linked planning details, financial entries, and exportable staff-facing documents.

It is intentionally optimized for reliability, speed, and daily usability in a local venue workflow rather than multi-user collaboration or cloud sync.

## What It Does

- Creates and manages event records for venue operations
- Tracks event lifecycle and status progression
- Stores client and contact information
- Manages timeblocks and operational detail sections attached to the event timeline
- Tracks payments and charge items
- Generates estimate, BEO, and timeline preview/export flows
- Supports calendar-related event import and commit flows

## Architecture Highlights

Event Horizon is structured as a desktop app with explicit boundaries between UI, privileged Electron code, and storage.

- Renderer: React + Vite SPA with feature-oriented UI modules
- Preload: a constrained `contextBridge` layer exposing allowlisted IPC methods only
- Main process: Electron window lifecycle, app menu actions, IPC handler registration, filesystem/OS access, and database initialization
- Data layer: SQLite via `better-sqlite3`, modeled with Drizzle ORM and evolved through migrations
- Storage model: the local database is created in Electron's user data directory using `app.getPath("userData")`

The security and reliability baseline is also deliberate:

- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- allowlisted IPC channels instead of a generic passthrough bridge
- migration-driven schema updates on app startup

## Tech Stack

- Node 22
- Electron
- React 19
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI
- TanStack Query
- SQLite with `better-sqlite3`
- Drizzle ORM and Drizzle Kit
- Vitest

## Project Structure

```text
src/
  electron/
  features/
  lib/
  routes/
docs/
migrations/
```

- `src/electron/main.ts` bootstraps Electron, creates the main window, initializes the database, and rebuilds the app menu
- `src/electron/preload.cts` exposes the allowlisted renderer API through `contextBridge`
- `src/electron/ipcRoutes/` contains IPC handlers that receive renderer requests and forward them to the appropriate backend logic
- `src/electron/db/` contains the database setup, schema, migrations support, and repository layer
- `src/features/` contains higher-level renderer features such as calendar and event detail workflows
- `src/lib/ipc/` contains the frontend-side IPC callers used by the renderer
- `src/routes/previews/` contains preview routes for generated event documents such as estimates and timelines
- `docs/PROJECT.md` documents the broader technical context and project goals
- `migrations/` contains Drizzle migration files used to evolve the SQLite schema safely

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

- rebuilds `better-sqlite3` for the Electron runtime
- starts the Vite dev server on port `42069`
- transpiles and launches the Electron process

On startup, the app initializes a local SQLite database in Electron's user data directory and attempts to run the latest Drizzle migrations automatically.

## Useful Scripts

- `npm run dev` starts the local development workflow for React and Electron
- `npm run build` type-checks Electron, builds the TypeScript project, and creates the renderer build
- `npm run test` rebuilds `better-sqlite3` for Node and runs the Vitest suite
- `npm run test:fast` runs tests without the Node rebuild step
- `npm run lint` runs ESLint across the repo
- `npm run rebuild:electron` rebuilds `better-sqlite3` for the Electron runtime
- `npm run rebuild:node` rebuilds `better-sqlite3` for the Node runtime
- `npm run dist:mac` creates a macOS distribution build
- `npm run dist:win` creates a Windows distribution build
- `npx drizzle-kit generate` generates a new migration from schema changes
- `npx drizzle-kit migrate` applies migrations to the database

The rebuild scripts matter because SQLite is backed by native bindings, and the binary target differs between plain Node and Electron.

## Data Model Overview

The schema centers on `events`, which acts as the root record for venue work. Each event stores core details such as title, type, status, schedule, client information, guest counts, notes, and tracking metadata.

The main operational spine is `timeblocks`. Timeblocks represent timeline entries and bridge event-level planning to attached detail sections. That structure allows timeline-driven organization without flattening every event concern into a single table.

Supporting tables store more specialized event data, including:

- `payments`
- `menu_of_charge_items`
- `tournament_details`
- `cart_details`
- `notes`
- `setup_instructions`
- `vendor_items`
- `food_items`
- `beverage_items`

This model keeps the event record central while allowing operational detail to expand in focused tables rather than a single overloaded structure.

## Design Decisions

- Local-first desktop architecture: this app is designed for a real operational workflow on one machine, so SQLite and Electron are a better fit than introducing a hosted backend and sync layer
- Explicit IPC contracts: the renderer talks to the main process through named, allowlisted IPC routes rather than a generic bridge, which keeps the trust boundary clear
- Migration-backed schema management: Drizzle migrations make schema evolution intentional and safer for long-lived local data
- Feature-oriented renderer structure: renderer code is grouped around workflows such as calendar views and event detail management rather than only by technical layer
- Preview-driven document output: estimate, BEO, and timeline generation are part of the application flow rather than treated as an external reporting system

## Testing And Quality

This repo already includes automated tests with Vitest, plus linting and build/typecheck steps in the normal workflow. The current setup is aimed at catching regressions in key data and UI behavior without claiming exhaustive coverage.

For routine verification:

- run `npm run lint`
- run `npm run test`
- run `npm run build`

## Notes

Event Horizon is actively used as a practical internal tool, and the repo doubles as a case study in building a local-first operational desktop application with explicit process boundaries, typed IPC, and migration-backed local storage.
