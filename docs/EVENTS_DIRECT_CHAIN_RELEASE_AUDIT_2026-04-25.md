# Events Direct-Chain Release Audit (2026-04-25)

## Scope
Direct chain audited from `src/pages/Events.tsx` through hooks, IPC wrappers, preload allowlist, IPC handlers, repository, month helpers, schema references, and directly imported `src/components/events/*` plus `DateTimeInput` and `date-picker`.

## Gate Decision Rule
`FAIL` on any open `P0/P1`; otherwise `PASS` or `CONDITIONAL PASS` with tracked `P2/P3`.

## Baseline Evidence

### Automated checks
1. `npm run lint`
- Result: `PASS` (0 errors, 4 existing fast-refresh warnings).

2. `npm run test -- src/pages/Events.sidebar.test.tsx src/components/events/CalendarGrid.test.tsx src/hooks/useEvents.test.tsx src/hooks/useEventsQueryState.test.tsx src/electron/db/repository/events.test.ts`
- Result: `FAIL` (1 failing test, 35 passing tests).
- Failure:
  - `src/pages/Events.sidebar.test.tsx > renders unique accessible labels for sidebar header actions`
  - Reason: multiple buttons named `Search events`.

3. Optional confidence check:
`npm run test -- src/components/events/SidebarMiniCalendar.test.tsx src/components/events/CreateEventSidebarForm.test.tsx src/components/events/EditEventSidebarForm.test.tsx src/hooks/useEventsMonthQuery.test.tsx`
- Result: `PASS` (4 files, 21 tests).

4. Additional IPC boundary confidence checks:
- `npm run test -- src/electron/preload.test.ts` -> `PASS` (6 tests).
- `npm run test -- src/lib/ipc/ipcContracts.test.ts` -> `PASS` (62 tests).

### Runtime smoke attempt
- `npm run dev` could not be completed for this audit session because Vite port `42069` was already in use.
- Error observed: `Error: Port 42069 is already in use`.
- Existing listener was detected on `[::1]:42069`.

## Gate Checklist

| Gate | Status | Rationale |
|---|---|---|
| G1 Query/URL State Integrity | PASS | `useEventsQueryState` canonicalizes defaults/sanitizes invalid params and debounces search; tests cover defaults, sanitization, setters, and debounce. |
| G2 Month/Timezone Correctness | PASS | Month range and membership logic consistently use local-time month semantics converted to UTC boundaries (`months.ts` + repository month range query) with boundary inclusion/exclusion tested. |
| G3 CRUD + Cache Consistency | CONDITIONAL PASS | No direct stale/duplication defect found in static review; optimistic scope logic appears coherent. Coverage gap remains for explicit cross-month move + scheduled/unscheduled transition assertions in direct Events flow. |
| G4 IPC Boundary Safety | PASS | Preload invoke/send/on allowlists enforced; events channels are allowlisted; invalid month values rejected safely in handler path. |
| G5 UX/A11y Interaction | CONDITIONAL PASS | Duplicate accessible names in sidebar header actions and duplicate `id` attributes in date-picker instances reduce control addressability. |
| G6 Error/Logging Hygiene | CONDITIONAL PASS | Debug `console.log` statements are still present in production sidebar action handlers. |
| G7 Test Coverage Adequacy | CONDITIONAL PASS | Core pieces are tested, but critical regression paths (header action behavior, certain mutation/cache transitions, and handler-level validation coverage) are incomplete. |

## Findings

### F-01: Duplicate sidebar action labels + placeholder action handlers
- Severity: `P2`
- Gates: `G5`, `G6`
- Evidence:
  - `src/pages/Events.tsx:261` and `src/pages/Events.tsx:273` both set `aria-label="Search events"`.
  - `src/pages/Events.tsx:258` and `src/pages/Events.tsx:270` log debug strings instead of meaningful action behavior.
  - Failing test evidence in `src/pages/Events.sidebar.test.tsx:317` and command output above.
- Repro:
  1. Run the focused suite command from Baseline Evidence.
  2. Observe failure: multiple buttons with role/name `Search events`.
- Impact:
  - Header controls are not uniquely addressable to assistive tech and tests.
  - User-facing action semantics are unclear for those buttons.
- Owner: `Events UI owner`
- Remediation:
  - Assign unique accessible names and implement/disable unfinished actions.
  - Remove debug-only click behavior.
- Verification:
  - Re-run focused suite and ensure `Events.sidebar` passes.

### F-02: Duplicate DOM ids in reusable date picker inputs
- Severity: `P2`
- Gate: `G5`
- Evidence:
  - Fixed ids in `src/components/ui/date-picker.tsx:59` (`date-picker-input`) and `src/components/ui/date-picker.tsx:89` (`date-picker`).
  - Two `DateTimeInput` instances are rendered in `src/components/events/EventFormFields.tsx:110` and `src/components/events/EventFormFields.tsx:119`, creating duplicate ids in the same form.
- Repro:
  1. Render create/edit sidebar form.
  2. Inspect DOM and observe duplicate `id="date-picker-input"` and `id="date-picker"` nodes.
- Impact:
  - Invalid HTML id uniqueness and ambiguous element targeting.
- Owner: `UI component owner`
- Remediation:
  - Make ids instance-unique (e.g., `useId`) or remove hard-coded ids when not required.
- Verification:
  - Confirm unique ids across both datetime fields in create/edit forms.

### F-03: Coverage gaps for high-risk mutation and boundary paths
- Severity: `P2`
- Gates: `G3`, `G7`
- Evidence:
  - `src/hooks/useEvents.test.tsx` covers basic create/update/delete promise behavior but does not explicitly assert month-to-month move invalidation paths for update transitions.
  - No direct test file found for `eventsHandler` input-validation/error-path behavior in this chain.
- Repro:
  1. Review existing direct-chain tests in the focused suite.
  2. Observe missing explicit assertions for cross-month update movement and handler-level invalid input permutations.
- Impact:
  - Regressions in cache reconciliation and boundary rejection paths may slip through.
- Owner: `Events data + IPC owner`
- Remediation:
  - Add targeted tests for update transitions across month/unscheduled scopes.
  - Add `eventsHandler` tests for invalid ids/months and error propagation behavior.
- Verification:
  - New tests fail against broken behavior and pass after fixes.

## Blocking Findings
- Current blockers (`P0/P1`): **None**.

## Release Recommendation
- Overall decision: **CONDITIONAL PASS**.
- Recommendation under selected threshold (`P0/P1` fail gate): **Ready with tracked `P2` follow-ups**.

## Follow-up Verification Steps
1. Fix `F-01` and rerun:
- `npm run test -- src/pages/Events.sidebar.test.tsx`
- `npm run lint`

2. Fix `F-02` and rerun form/component tests:
- `npm run test -- src/components/events/CreateEventSidebarForm.test.tsx src/components/events/EditEventSidebarForm.test.tsx`

3. Address `F-03` by adding tests, then rerun focused regression suite:
- `npm run test -- src/hooks/useEvents.test.tsx src/electron/ipcRoutes/<events-handler-test-file>.test.ts`

4. Re-run full direct-chain baseline command from this audit before release sign-off.
