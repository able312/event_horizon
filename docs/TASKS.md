# TASKS

Last Updated: 2026-04-16
Source: Health check + dist:mac warning investigation + events month pagination implementation findings

## Current Status

- `npm run build`: PASS (2026-04-14)
- `npm run test`: PASS (24 files, 136 tests, 2026-04-15)
- `npm run lint`: PASS (4 warnings, 2026-04-15)
- `npm audit --omit=dev`: PASS (0 vulnerabilities, 2026-04-15)
- `npm audit`: 4 moderate dev-only vulnerabilities (tracked, 2026-04-15)
- `npm run dist:mac`: PASS (duplicate dependency reference warning, 2026-04-15)
- Release readiness: Early Release Ready

## Priority Legend

- Hu = For Human to consider
- P0 = release blocker
- P1 = high risk, fix before broad usage
- P2 = quality/stability improvements
- P3 = polish and cleanup

- FT = Feature - new functionality
- UX = UI/UX improvement to existing functionality

---

## Hu - Human Consideration

- Health check completed (see `docs/health-check.md`, 2026-04-15)
- Do I need playwright tests maybe or better e2e testing?
- What is on the other branch?
- Check lint warning issue
- Electron tsconfig showing type / degradation errors.
- Signature / Notorization - low priority

### Event Calendar Page

- Return to last view when leaving an event detail page.
- Re-organize / design calendar and list view: use opencode with work Gemini sub?
- Add click on calendar square to add new event
- Add left click on event entry on calendar to see options or hover for more details?
- Either way we need to see status or something more on the calendar.

---

## P0 - Release Blockers

---

## P1 - High Risk

---

## P2 - Stability and UX Correctness

### [OPS-01] Native module test workflow caveat

**Status:** Tracking  
**Priority:** Medium  
**Type:** Stability

#### Context

- `rebuild:test` script is no longer present.
- Current reliable test command is `npm run test` (already runs `rebuild:node`).
- `npm run test:fast` bypasses rebuild and may fail after Node/runtime drift.

#### Goal

- Keep routine local/CI testing on `npm run test`.
- Keep this caveat documented to avoid false-negative test failures.

---

### [OPS-02] Dev dependency vulnerability monitoring cadence

**Status:** Tracking  
**Priority:** Medium  
**Type:** Stability / Security

#### Context

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 4 moderate vulnerabilities in dev dependency chain via `drizzle-kit`.

#### Goal

- Track as non-blocking dev-only risk.
- Recheck monthly and on dependency upgrades.

---

### [OPS-04] Investigate `dist:mac` duplicate dependency references warning

**Status:** Ready for Development  
**Priority:** Medium  
**Type:** Stability / Release

#### Context

- Reproduced on 2026-04-15 with `npm run dist:mac` (build exits successfully).
- Electron builder logs:
  - `duplicate dependency references` during node module search (arm64 and x64 packaging passes).
- Current evidence indicates this comes from `app-builder-lib` npm collector duplicate-reference tracking (informational), not a hard error.
- Why this matters (junior note):
  - Even if non-blocking, noisy packaging warnings can hide real packaging issues later.

#### Goal

- Confirm whether this warning is expected noise from npm dependency traversal or a real dependency graph problem.
- Keep packaging logs understandable and ensure no incorrect runtime module packaging.

#### Acceptance Criteria

- [ ] Reproduce warning in a clean environment and confirm consistency.
- [ ] Verify packaged app runs normally and native modules still load (especially `better-sqlite3`).
- [ ] Document root cause in `docs/health-check.md` (or release notes section in TASKS) with one clear decision:
  - [ ] Accept warning as informational and track only.
  - [ ] Or implement mitigation to reduce/remove warning noise.
- [ ] If mitigation is chosen, keep `npm run dist:mac` passing for both `arm64` and `x64`.

#### Investigation Checklist

- [ ] Capture full `npm run dist:mac` logs and isolate warning stage.
- [ ] Compare dependency tree output (`npm ls --all`) for duplicate reference patterns.
- [ ] Check whether dependency version fragmentation contributes noise (example: mixed Radix patch versions `@radix-ui/react-primitive@2.1.3` and `2.1.4`).
- [ ] Evaluate whether lockfile or packaging config changes actually reduce warning volume without breaking build output.

#### Out of Scope

- Dependency upgrades purely for cleanup without measurable packaging benefit.
- Signing/notarization setup changes.

---

### [UX-01] Move dashboard / event calendar state to URL query params

**Status:** Ready for Development  
**Priority:** Medium  
**Type:** UX

#### Problem

When navigating back to the dashboard / calendar UI, the component reloads
with fresh state instead of returning to the last selected view and date.
This breaks continuity and creates a frustrating user experience.

#### Goal

Move dashboard state (view, date, filters) from local React state to URL-driven
state using React Router query params. Ensure state is persistent, shareable,
and behaves correctly with navigation.

#### Context

- `src/pages/events`
- `src/hooks/useEventsQueryState.ts` (new)

#### Query Param Schema

- view: `"calendar"` | `"list"`
- date: string (format: `YYYY-MM`)
- search: string | null
- type: null | `"tournament"` | `"function"` | `"wedding"`
- status:
  - `"new_lead"`
  - `"contacted"`
  - `"ready_for_estimate"`
  - `"estimate_sent"`
  - `"estimate_confirmed"`
  - `"agreement_sent"`
  - `"agreement_and_deposit_received"`
  - `"planning"`
  - `"details_locked"`
  - `"event_complete"`
  - `"invoice_sent"`
  - `"paid_in_full"`
  - `"closed"`
  - `"lost"`

Example:
`/events?view=calendar&date=2026-04`

#### Requirements

- [ ] URL is the single source of truth (no duplicated `useState`)
- [ ] UI always reflects URL state
- [ ] Updating UI updates URL (not local state first)
- [ ] Implement logic as reusable hook: `useEventsQueryState`

##### Defaults

- [ ] view = `"calendar"`
- [ ] date = current month (`YYYY-MM`)
- [ ] search, type, status = null (removed from URL)

##### Validation & Sanitization

- [ ] Sanitize and validate all incoming query params
- [ ] Invalid values revert to defaults
- [ ] Normalize date format (`YYYY-MM`)
- [ ] Normalize and update URL on load if needed (using replace)

##### URL Behavior

- [ ] Use `useSearchParams` (React Router)
- [ ] Use history `replace` (not push) for updates
- [ ] Do not update URL if values have not changed
- [ ] Remove empty/null values from URL (no `search=`)

##### Navigation Behavior

- [ ] Browser back/forward restores previous state
- [ ] Direct URL access loads correct state
- [ ] Refresh preserves state

##### Search Behavior

- [ ] Debounce updates to URL for search input

#### Hook Specification

Create:

`src/hooks/useEventsQueryState.ts`

```ts
export type EventView = "calendar" | "list";

import type EventType from "~/defintions/database";
import type EventStatus from "~/definitions/database";

export interface EventsQueryState {
  view: EventView;
  date: string;
  search: string | null;
  type: EventType | null;
  status: EventStatus | null;
}

export interface UseEventsQueryStateReturn {
  state: EventsQueryState;

  setView: (view: EventView) => void;
  setDate: (date: string) => void;
  setSearch: (search: string | null) => void;
  setType: (type: EventType | null) => void;
  setStatus: (status: EventStatus | null) => void;

  reset: () => void;
}
```

Adjustments to this hook may be made, just suggest good changes and ask first.

#### Hook Behavior

- [ ] Parses query params using `useSearchParams`
- [ ] Validates and sanitizes all values
- [ ] Applies defaults when params are missing/invalid
- [ ] Normalizes values (e.g. `2026-4` → `2026-04`)
- [ ] Removes empty values from URL
- [ ] Uses history `replace` for updates
- [ ] Avoids redundant updates
- [ ] Acts as single source of truth for state

#### Out of Scope

- Changing styling or layout
- API pagination changes
- Changing search/filter logic behavior

#### Notes

- This establishes a reusable pattern for URL-driven state across the app
- Future pages should follow this hook-based approach

---

### [DATA-01] Normalize event timestamp format (`createdAt` / `updatedAt`)

**Status:** Ready for Development  
**Priority:** Medium  
**Type:** Data Integrity / Stability

#### Context

- `events.createdAt` and `events.updatedAt` are stored as `text`.
- Current write paths are inconsistent:
  - Some code writes epoch-milliseconds as strings (example: `Date.now().toString()`).
  - Other code writes ISO strings (example: `new Date().toISOString()`).
- Why this matters (junior note):
  - Mixed date formats make sorting and parsing easier to break over time.
  - A future change can accidentally assume one format and silently mis-handle older rows.

#### Goal

- Choose one canonical timestamp format for `events.createdAt` / `updatedAt`.
- Enforce it across all event write paths (main process and optimistic cache).
- Keep read behavior deterministic during migration window.

#### Acceptance Criteria

- [ ] Canonical format is documented in `docs/PROJECT.md` and/or repo conventions.
- [ ] All event write paths use the canonical format.
- [ ] Existing mixed-format rows are handled safely via one explicit strategy:
  - [ ] Backfill existing rows to canonical format, or
  - [ ] Keep compatibility parser + staged cleanup ticket.
- [ ] Tests cover sorting/parsing behavior for both legacy and canonical data until migration is complete.

#### Out of Scope

- Full timestamp normalization across every non-event table (track separately if needed).

---

### [OPS-05] Make month pagination timezone source explicit

**Status:** Ready for Development  
**Priority:** Medium  
**Type:** Stability / UX Correctness

#### Context

- Month-based event pagination currently uses local timezone boundaries.
- Local timezone is currently derived from the machine runtime environment.
- Why this matters (junior note):
  - If the machine timezone differs from the venue timezone, an event near midnight can appear in the wrong month bucket.

#### Goal

- Define and document one explicit timezone source of truth for month membership.
- Ensure month boundary calculations are deterministic and not accidentally changed by OS timezone drift.

#### Acceptance Criteria

- [ ] Timezone source-of-truth decision is documented (system local vs configured venue timezone).
- [ ] Month range calculation code uses that decision consistently.
- [ ] At least one test covers a boundary-time event near month transition and validates expected month assignment.

#### Out of Scope

- Multi-timezone support per event.

---

## P3 - Cleanup / Tech Debt

### [OPS-03] Resolve fast-refresh lint warnings

**Status:** Tracking  
**Priority:** Low  
**Type:** Cleanup

#### Context

Current warnings from `react-refresh/only-export-components`:

- `src/components/ui/button.tsx:66`
- `src/components/ui/form.tsx:157`
- `src/components/ui/sidebar.tsx:727`
- `src/contexts/OverlayManager.tsx:18`

#### Goal

- Keep lint warning count at 4 or lower until cleaned up.
- Move shared constants/helpers out of component-only files to remove warnings.

---

## Validation Checklist (Run Before Release)

- [ ] `npm run test`
  - Includes `npm run rebuild:node`
- [ ] `npm run lint`
  - Tracked and expectedly throws 4 warnings from `react-refresh/only-export-components`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev`
- [ ] `npm audit`
  - Leaves 4 moderate severity dev dependency warnings
- [ ] `npm run dev` smoke test:
  - [ ] Events list load/create/edit/delete
  - [ ] Event detail sections CRUD
  - [ ] Timeline render and sort correctness
  - [ ] Preview generation and PDF save flow
- [ ] Migration path validated on existing DB copy
- [ ] No secrets or local DB artifacts committed

## Notes

- Any DB schema change must include a migration.
