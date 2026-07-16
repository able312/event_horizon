# TASKS

Last Updated: 2026-07-15
Source: Feature branch merge-readiness review + existing release and stability findings

## Current Branch Status

- Branch: `feature/overview-page`
- `npm run build`: FAIL — TypeScript errors must be resolved before merge (2026-07-15)
- Last full test run: FAIL — 3 files failed, 10 tests failed (2026-07-15)
- Focused Overview/router tests: PASS — 14 tests (2026-07-15)
- `npm run lint`: PASS with 3 warnings (2026-07-15)
- `npm audit --omit=dev`: PASS (0 vulnerabilities, 2026-04-15)
- `npm audit`: 4 moderate dev-only vulnerabilities (tracked, 2026-04-15)
- `npm run dist:mac`: PASS (duplicate dependency reference warning, 2026-04-15)
- Merge readiness: BLOCKED — see P0 items below

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

- Do I need playwright tests maybe or better e2e testing?
- Signature / Notorization - low priority

### Event Calendar Page

- Return to last view when leaving an event detail page.
- Re-organize / design calendar and list view: use opencode with work Gemini sub?
- Add click on calendar square to add new event
- Add left click on event entry on calendar to see options or hover for more details?
- Either way we need to see status or something more on the calendar.

---

## P0 - Release Blockers

### [BUILD-01] Restore a clean production build

**Status:** Ready for Development<br>
**Priority:** Blocking<br>
**Type:** Build / Type Safety

#### Current Failures

- `src/features/event-detail/workspace/hooks/useEventDetailRouteState.ts`
  - `EventDetailRouteParams` does not satisfy React Router's `useParams` generic constraint.
- Timeline and workspace test fixtures no longer satisfy the required `TimelineTimeblock` / `TimeblockWithItems` fields.
- `src/features/calendar/views/CalendarGrid.test.tsx` imports missing `./calendarDraftPreview`.
- Several hook and IPC contract tests have fixture/cast type mismatches exposed by the test TypeScript project.

#### Acceptance Criteria

- [ ] `npm run build` passes without TypeScript errors.
- [ ] Do not hide failures by excluding affected production or test files from type-checking.

---

### [TEST-01] Restore the full test suite

**Status:** Ready for Development<br>
**Priority:** Blocking<br>
**Type:** Testing

#### Context

- The last full run reported 3 failed files and 10 failed tests.
- The new Overview and workspace-router coverage passes independently (14 tests), but focused tests do not replace the full suite.

#### Acceptance Criteria

- [ ] Run `npm run test` so the native module is rebuilt for Node.
- [ ] All test files pass.
- [ ] Confirm failures are fixed rather than skipped or removed without justification.

---

### [MERGE-01] Resolve the dirty working tree before merge

**Status:** Needs Decision<br>
**Priority:** Blocking<br>
**Type:** Git / Documentation

#### Context

- `docs/internal-notes-sync-bug-explained.html` is currently deleted but the deletion is not committed.
- The file documents the controlled-input/data-loss issue fixed by this branch.

#### Acceptance Criteria

- [ ] Decide whether the explanation remains useful project documentation.
- [ ] Restore the file, or intentionally commit its deletion.
- [ ] Confirm `git status` contains no unintended changes before merging.

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

### [DOC-01] Repair stale documentation references

**Status:** Ready for Development<br>
**Priority:** Low<br>
**Type:** Documentation

#### Context

- `docs/health-check.md` was removed on this branch.
- Existing task/release notes must not direct readers to a deleted document.

#### Acceptance Criteria

- [ ] Restore `docs/health-check.md`, or remove/replace every stale reference to it.
- [ ] Keep historical audit findings discoverable if the old file remains intentionally deleted.

---

### [OPS-06] Remove deprecated npm `devdir` configuration

**Status:** Tracking<br>
**Priority:** Low<br>
**Type:** Tooling

#### Context

- npm prints: `Unknown env config "devdir". This will stop working in the next major version of npm.`
- This is non-blocking today but will become incompatible with a future npm major version.

#### Acceptance Criteria

- [ ] Identify whether `devdir` comes from user, project, or environment npm configuration.
- [ ] Remove or replace the deprecated configuration.
- [ ] Confirm npm scripts run without the warning.

---

### [CODE-01] Remove changed-file whitespace errors

**Status:** Ready for Development<br>
**Priority:** Low<br>
**Type:** Cleanup

#### Context

- `git diff --check main...HEAD` reports trailing whitespace in:
  - `OverviewWorkspaceSection.tsx`
  - `ClientDetailsCard.tsx`

#### Acceptance Criteria

- [ ] Remove trailing whitespace from changed files.
- [ ] `git diff --check main...HEAD` passes.

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

Current warnings from `react-refresh/only-export-components` (2026-07-15):

- `src/components/atoms/button.tsx:68`
- `src/components/layouts/SplitLayout.tsx:52`
- `src/components/layouts/SplitLayout.tsx:74`

#### Goal

- Keep lint warning count at 3 or lower until cleaned up.
- Move shared constants/helpers out of component-only files to remove warnings.

---

## Validation Checklist (Run Before Release)

- [ ] Working tree contains no unintended or unresolved changes
- [ ] `git diff --check main...HEAD`
- [ ] `npm run test`
  - Includes `npm run rebuild:node`
- [ ] `npm run lint`
  - Currently expected to report 3 tracked warnings from `react-refresh/only-export-components`
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