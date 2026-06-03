# Health Check Report

Date: 2026-04-15  
Scope: Release Gates  
Result: Early release ready with tracked non-blocking risks

## Why this check exists

For junior-engineer context: this check separates "broken now" issues from
"safe to ship, but should improve next" issues.

## Commands run (actual)

1. `npm run rebuild:test` -> failed (`Missing script: "rebuild:test"`)
2. `npm run lint` -> pass with 4 warnings
3. `npm run rebuild:node && npm run test` -> pass (24 files, 136 tests)
4. `npm run build` -> pass
5. `npm audit --omit=dev` -> pass (0 vulnerabilities)
6. `npm audit` -> 4 moderate vulnerabilities (dev dependency chain via `drizzle-kit`)

## Severity Buckets

### P0 - Release Blockers

- None found.

### P1 - High Risk

- None found.

### P2 - Stability / Workflow Risks (track, not blocking release)

- Test workflow drift:
  - `rebuild:test` no longer exists.
  - Current reliable command is `npm run test`, which already runs
    `npm run rebuild:node && vitest run`.
  - `npm run test:fast` bypasses rebuild and may fail after Node/runtime changes.

### P3 - Cleanup / Tech Debt

- Fast-refresh lint warnings (non-blocking):
  - `src/components/ui/button.tsx:66`
  - `src/components/ui/form.tsx:157`
  - `src/components/ui/sidebar.tsx:727`
  - `src/contexts/OverlayManager.tsx:18`
- Dev-only audit findings:
  - 4 moderate vulnerabilities in a `drizzle-kit` dependency chain
  - Current recommendation: track and defer unless tooling upgrade is planned

## Security/Architecture sanity notes

- IPC allowlisting remains in place via preload channel sets.
- Electron window baseline remains secure:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `webSecurity: true`

Reference files:
- `src/electron/main.ts`
- `src/electron/preload.cts`

## Manual smoke checklist (recommended each release)

- [ ] Launch app and load events list
- [ ] Create/edit/delete one event
- [ ] Open event detail sections and save changes
- [ ] Generate one preview/PDF path
- [ ] Restart app and confirm data persistence
