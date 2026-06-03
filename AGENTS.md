# Event Horizon

In-house app for storing, compiling and outputting event details.

## Why This Exists

This is for private, in-house use to save, manage & organize details for the events hosted at our venue. I will be the sole user of this software for the time being.

## Architecture

Key directories and their purpose:

- src/electron/db/repositrories — Database table repositories
- src/electron/db/schema.ts — data models
- src/electron/ipcRoutes — ipc handlers for incoming requests from the renderer process, sends requests to appropriate repo functions
- src/lib/ipc - frontend code for calling ipc handlers
- src/lib/defenitions - typescript types & constants - many types are derived from the schema.ts tables.

## Docs

Key docs for AI Agents and their purpose:

- docs/PROJECT.md - Further defines the technical implementation of the app and the tech stack used.

## Tech Stack Overview

- Runtime: Node 22
- Framework: React Vite (pages router)
- DB: better-sqlite3
- Tests: not implemented

## Commands

npm run dev # compile electron to dist-electron and start both electron and dev server
npm run lint # eslint
npm run rebuild:electron # rebuild sqlite3 for electron runtime
npm run rebuild:node # rebuild sqlite3 for node runtime
npx drizzle-kit generate # generate drizzle migration from schema
npx drizzle-kit migrate # migrate database from drizzle migration - app attempts migration on every start up automatically.

## Coding Conventions

- TypeScript strict mode — no any
- Functional components only (React)
- Conventional commit messages

## Rules for This Agent

- Read docs/PROJECT.md.md before starting
- Never modify the DB schema without a migration
- Ask before adding new dependencies
- Never commit .env or secrets
- The prompter is a junior engineer and wants to continue to learn as we build this project. Therefore:
  - When in plan mode, for more complex issues, explain the core issue in a way that a junior developer can follow understand and learn before writing the final plan.
