# Event Horizon

In-house app for storing, compiling and outputting event details.

## Why This Exists

This is for private, in-house use to save, manage & organize details for the events hosted at our venue.
I, the creator, have been the sole user of this software so far. I am starting to look towards the future where this tool will be the main for my team to synchronize our information and understanding of the events we host.

## Docs

Key docs for AI Agents and their purpose:

- docs/PROJECT.md - Further defines the technical implementation of the app and the tech stack used.

## Tech Stack Overview

- Runtime: Node 22
- Framework: React Vite (pages router)
- DB: better-sqlite3
- Tests: not implemented

## Test Policy
Tests are required for migrations, repositories, IPC handlers, and pure logic. Do not write render-only tests for React components unless the component contains non-trivial logic.

## Coding Conventions

- TypeScript strict mode — no any
- Functional components only (React)
- Conventional commit messages

## Rules for This Agent

- Read docs/PROJECT.md before starting
- Never modify the DB schema without a migration
- Ask before adding new dependencies
- Never commit .env or secrets
