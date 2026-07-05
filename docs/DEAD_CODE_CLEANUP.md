# Dead Code Cleanup Inventory

Generated: 2026-07-04

This document lists dead code identified via static analysis ([fallow](https://docs.fallow.tools)) and manual verification against the current codebase. Items are grouped by cleanup action: whole-file deletion vs. partial cleanup (specific exports, functions, types, or dependencies).

**How to read severity**

| Label | Meaning |
|---|---|
| **Delete file** | No production import path; safe to remove the file (and its test file if listed). |
| **Remove export** | Symbol is live internally or only used in tests; drop `export` or delete the symbol if test-only. |
| **Remove dependency** | Package is not imported anywhere in app code. |
| **Review** | Likely dead, but verify manually before deleting (e.g. IPC handlers may still exist on the main process side). |

---

## Summary

| Category | Count |
|---|---|
| Whole files to delete | 14 files (+ 8 associated test files) |
| Partial cleanups (exports / functions / types) | ~35 symbols across 15 files |
| Unused npm dependencies | 4 |
| Stale config references | 2 |

---

## 1. Whole files to delete

These files are unreachable from production entry points. Several were superseded during the calendar sidebar refactor or the event-detail workspace migration.

### Database / validation

| File | Status | Notes |
|---|---|---|
| `src/electron/db/validation.ts` | **Delete file** | Stub module with `selectEventSchema` and `insertEventSchema`. Nothing imports it. The header comment says it is intentionally empty pending future use. |

### Calendar — legacy modal UI (replaced by sidebar forms)

Create/edit now flows through `CreateEventSidebarForm` / `EditEventSidebarForm` in `CalendarPanelOrchestrator.tsx`. These modal components are only referenced by their own tests.

| File | Status | Notes |
|---|---|---|
| `src/features/calendar/dialogs/CreateEventModal.tsx` | **Delete file** | Superseded by `src/features/calendar/forms/CreateEventSidebarForm.tsx`. |
| `src/features/calendar/dialogs/CreateEventModal.test.tsx` | **Delete file** | Tests the removed modal. Coverage exists on `CreateEventSidebarForm.test.tsx`. |
| `src/features/calendar/dialogs/EditEventModal.tsx` | **Delete file** | Superseded by `src/features/calendar/forms/EditEventSidebarForm.tsx`. |
| `src/features/calendar/dialogs/EditEventModal.test.tsx` | **Delete file** | Tests the removed modal. Coverage exists on `EditEventSidebarForm.test.tsx`. |

Within those modal files, also remove before deletion (or they go away with the file):

- `export default CreateEventModal` / `export default EditEventModal` — redundant default exports; named exports were only used in tests.
- `export const CreateEventModal` / `export const EditEventModal` — the components themselves.

### Calendar — legacy unscheduled events panel

Unscheduled events now render via `EventsTable` in `CalendarPageOrchestrator.tsx` when `bodyView === "unscheduled-list"`.

| File | Status | Notes |
|---|---|---|
| `src/features/calendar/views/UnscheduledEvents.tsx` | **Delete file** | Replaced by `EventsTable`. |
| `src/features/calendar/views/UnscheduledEvents.test.tsx` | **Delete file** | Tests the removed component. |

### Event detail — legacy food section UI

Food editing now lives in `src/features/event-detail/sections/food-beverage-workspaces/FoodWorkspaceSection.tsx`. The old detail-section component chain is orphaned.

| File | Status | Notes |
|---|---|---|
| `src/components/event-detail/detail-sections/sections/FoodSection.tsx` | **Delete file** | Replaced by `FoodWorkspaceSection`. |
| `src/components/event-detail/detail-sections/sections/FoodSection.test.tsx` | **Delete file** | Tests the removed component. |
| `src/components/atoms/DetailsTimeblock.tsx` | **Delete file** | Only imported by `FoodSection.tsx`. `GolfDetailsTimeblock.tsx` is the live equivalent for golf/cart sections. |
| `src/components/atoms/GenericItemCard.tsx` | **Delete file** | Only imported by `FoodSection.tsx`. |
| `src/components/atoms/GenericItemCard.test.tsx` | **Delete file** | Tests the removed card component. |

### Timeline — unused sort helper

`EventTimeline.tsx` inlines equivalent sort logic (lines 25–33) and never imports this module.

| File | Status | Notes |
|---|---|---|
| `src/components/event-detail/detail-sections/sections/timeline/sortTimelineTimeblocks.ts` | **Delete file** | Exported function `sortTimelineTimeblocks` is never called from production code. |
| `src/components/event-detail/detail-sections/sections/timeline/sortTimelineTimeblocks.test.ts` | **Delete file** | Tests the unused helper. Consider extracting shared sort logic into one place if you want to keep the test coverage. |

### Search utilities — orphaned hook chain

| File | Status | Notes |
|---|---|---|
| `src/hooks/util/useSearchView.ts` | **Delete file** | Generic debounced name search hook. Only imported by its test file. |
| `src/hooks/util/useSearchView.test.tsx` | **Delete file** | Tests the removed hook. |
| `src/lib/debounce.ts` | **Delete file** | `useDebounceValue` is only consumed by `useSearchView.ts`. Event search debouncing is handled elsewhere (`useEventsQueryState`). |

---

## 2. Partial cleanup within files

### 2a. Remove unused exports (keep symbol if used internally)

#### shadcn/ui atom components — unused re-exports

These are standard shadcn barrel exports that nothing in the app imports. Low priority: trimming them makes future shadcn CLI updates slightly harder. Either remove from the export list or stop exporting the underlying components.

**`src/components/atoms/dialog.tsx`** — remove unused exports:

- `DialogClose` (line 132)
- `DialogOverlay` (line 137)
- `DialogPortal` (line 138)
- `DialogTrigger` (line 140)

Note: `DialogOverlay`, `DialogPortal`, etc. are still used *inside* the file by `DialogContent`; only the public exports are dead.

**`src/components/atoms/dropdown-menu.tsx`** — remove unused exports:

- `DropdownMenuPortal` (line 241)
- `DropdownMenuGroup` (line 244)
- `DropdownMenuLabel` (line 245)
- `DropdownMenuCheckboxItem` (line 247)
- `DropdownMenuRadioGroup` (line 248)
- `DropdownMenuRadioItem` (line 249)
- `DropdownMenuSeparator` (line 250)
- `DropdownMenuShortcut` (line 251)
- `DropdownMenuSub` (line 252)
- `DropdownMenuSubTrigger` (line 253)
- `DropdownMenuSubContent` (line 254)

#### Sidebar forms — redundant default exports

Production code default-imports these; the named exports are never imported elsewhere.

| File | Symbol | Action |
|---|---|---|
| `src/features/calendar/forms/CreateEventSidebarForm.tsx` | `export const CreateEventSidebarForm` | **Remove export** or drop default export and standardise on one export style. |
| `src/features/calendar/forms/EditEventSidebarForm.tsx` | `export const EditEventSidebarForm` | Same as above. |

#### Setup instruction prefill

| File | Symbol | Action |
|---|---|---|
| `src/definitions/timeblocks/setupInstructionPrefill.ts` | `export const SECTION_DEFAULT_PREFILLS` | **Remove export** — used only by `getSetupInstructionPrefill()` in the same file. |

#### Route state helpers — over-exported internals

| File | Symbol | Action |
|---|---|---|
| `src/features/event-detail/workspace/lib/eventDetailRouteState.ts` | `export function sectionFromNodeId` | **Remove export** — used internally by `resolveEventDetailRouteState` and friends. |
| `src/features/event-detail/workspace/lib/eventDetailRouteState.ts` | `export function getDefaultSelectedNodeId` | **Remove export** — used internally; only referenced externally in tests. |

#### Google Calendar helpers — over-exported internals

| File | Symbol | Action |
|---|---|---|
| `src/lib/googleCalendar.ts` | `export function formatGoogleCalendarDateUtc` | **Remove export** — used internally by `buildGoogleCalendarCreateUrl` / `buildGoogleCalendarUpdateUrl`. |
| `src/lib/googleCalendar.ts` | `export function buildGoogleCalendarDescription` | **Remove export** — same as above. |

#### Hotkey parser — over-exported internal

| File | Symbol | Action |
|---|---|---|
| `src/lib/hotKeys.ts` | `export function parseHotkeyCombo` | **Remove export** — used internally by `useHotkey`. Keep exported if you want direct unit testing without going through the hook. |

#### IPC error helper — over-exported internal

| File | Symbol | Action |
|---|---|---|
| `src/electron/ipcRoutes/ipcErrors.ts` | `export function toError` | **Remove export** — used internally by `logAndThrow`. Tests import it directly today; either keep export for tests or test via `logAndThrow` only. |

### 2b. Delete unused functions (test-only or fully orphaned)

#### Event detail route state

| File | Symbol | Action |
|---|---|---|
| `src/features/event-detail/workspace/lib/eventDetailRouteState.ts` | `export function buildEventDetailNavigationPath` (line 303) | **Delete function** — no production caller. Only referenced in `eventDetailRouteState.test.ts`. |

#### Financial calculations — superseded helpers

Production uses `computeFinancialSummaryAllSources` (via `FinancialWorkspaceSection.tsx` and previews). These older helpers are only exercised in `financial.test.ts`:

| File | Symbol | Action |
|---|---|---|
| `src/features/event-detail/workspace/lib/financial.ts` | `computeFinancialSummary` | **Delete function** (or stop exporting and fold tests into `computeFinancialSummaryAllSources`). |
| `src/features/event-detail/workspace/lib/financial.ts` | `computeCategorySubtotalCents` | **Delete function** — test-only. |
| `src/features/event-detail/workspace/lib/financial.ts` | `computeAllChargesSubtotalCents` | **Delete function** — test-only. |

These functions in the same file are used internally by `computeFinancialSummaryAllSources` but never imported elsewhere — **remove export only**:

- `computeFoodSubtotalCents`
- `computeBeverageSubtotalCents`
- `computeGratuityBaseCents`
- `computeGratuityCents`

### 2c. Unused IPC renderer wrappers

These invoke handlers that may still exist in the main process, but no production renderer code calls them. Removing the renderer wrapper is safe; consider removing matching IPC handlers in a follow-up pass.

**`src/lib/ipc/ipcEventsQueries.ts`**

| Function | Action |
|---|---|
| `getAllEvents` | **Delete function** — only referenced in `ipcContracts.test.ts` and test mocks. |

**`src/lib/ipc/cartDetails.ts`**

Live functions: `getOrCreateCartDetailsByEventId`, `updateCartDetails` (via `useCartDetailsSection.ts`).

| Function | Action |
|---|---|
| `getCartDetails` | **Delete function** |
| `getCartDetailsByEventId` | **Delete function** |
| `createCartDetails` | **Delete function** |
| `deleteCartDetails` | **Delete function** |

**`src/lib/ipc/tournamentDetails.ts`**

Live functions: `getOrCreateTournamentDetailsByEventId`, `updateTournamentDetails` (via `useTournamentDetailsSection.ts`).

| Function | Action |
|---|---|
| `getTournamentDetails` | **Delete function** |
| `getTournamentDetailsByEventId` | **Delete function** |
| `createTournamentDetails` | **Delete function** |
| `deleteTournamentDetails` | **Delete function** |

**`src/lib/ipc/vendorItems.ts`**

Live functions: `getVendorsByEvent`, `createVendor`, `updateVendor` (via `useVendorSection.ts`). Deletion uses `useTimeblockMutations.removeTimeblock` instead.

| Function | Action |
|---|---|
| `deleteVendor` | **Delete function** — only referenced in `ipcContracts.test.ts` and `useVendorSection.test.tsx` mocks. |

### 2d. Unused exported types

These types are exported but never imported elsewhere. Remove the `export` keyword (keep the type if it documents a hook return value locally).

| File | Type | Action |
|---|---|---|
| `src/definitions/database.ts` | `NewMenuOfChargeItem` | **Remove export** |
| `src/definitions/database.ts` | `NewTimeblock` | **Remove export** |
| `src/features/calendar/hooks/useCalendarWorkspaceViewModel.ts` | `UseCalendarWorkspaceViewModelReturn` | **Remove export** |
| `src/features/calendar/hooks/useEventDeleteConfirmation.ts` | `UseEventDeleteConfirmationReturn` | **Remove export** |
| `src/features/calendar/hooks/useIcsImportController.ts` | `IcsImportPhase` | **Remove export** |
| `src/features/calendar/hooks/useIcsImportController.ts` | `UseIcsImportControllerReturn` | **Remove export** |
| `src/hooks/useSetupInstrucionSection.ts` | `AddSetupInstructionOptions` | **Remove export** |
| `src/lib/months.ts` | `MonthParts` | **Remove export** |

---

## 3. Unused npm dependencies

Verified: no imports of these packages anywhere under `src/`. The corresponding shadcn atom components (`label`, `separator`, `switch`) were never added to the project.

| Package | Location | Action |
|---|---|---|
| `@radix-ui/react-label` | `dependencies` | **Remove** — no `label.tsx` component. |
| `@radix-ui/react-separator` | `dependencies` | **Remove** — no `separator.tsx` component. |
| `@radix-ui/react-switch` | `dependencies` | **Remove** — no `switch.tsx` component. |
| `react-hook-form` | `dependencies` | **Remove** — no imports anywhere. |

### Related dependency / config notes

| Item | Action |
|---|---|
| `@tailwindcss/line-clamp` | Referenced in `tailwind.config.js` but **not installed** and **no `line-clamp` classes** used in `src/`. Tailwind v4 includes line-clamp utilities natively. Remove the plugin line from `tailwind.config.js`. |
| `@tailwindcss/vite` | Correctly in `dependencies` (used by `vite.config.ts`). Fallow's "test-only" flag here is a false positive. |

---

## 4. Stale config (not runtime dead code, but cleanup-worthy)

| File | Issue | Action |
|---|---|---|
| `tailwind.config.js` | Legacy Tailwind v3-style config. The app builds with Tailwind v4 via `@tailwindcss/vite` in `vite.config.ts` and `src/index.css`. Still referenced by `components.json` for shadcn CLI scaffolding. | Remove `@tailwindcss/line-clamp` plugin entry. Consider migrating shadcn config to v4 CSS-based setup and deleting this file when convenient. |
| `src/features/calendar/views/CalendarGrid.test.tsx` | Imports `./calendarDraftPreview` but the module lives at `src/features/calendar/lib/calendarDraftPreview.ts`. | **Fix import path** — broken test import, not dead code in the module itself. |

---

## 5. Not dead code (common false positives)

Do **not** delete these based on static analysis alone:

| File / symbol | Why it is live |
|---|---|
| `src/electron/preload.cts` | Electron entry point referenced from `main.ts` (`preload.cjs` after compile). |
| `createEventsRepository`, `createTimeblocksRepository`, etc. | Default-exported from repository modules and wired through IPC handlers / `db/index.ts`. |
| `computeFinancialSummaryAllSources`, `toCurrency`, etc. | Used by `FinancialWorkspaceSection.tsx` and PDF preview routes. |
| `IcsImportReviewDialog.tsx` | Imported by `CalendarWorkspace.tsx`. |
| `FoodWorkspaceSection.tsx`, `useFoodSection.ts` | Active food editing path. |

---

## 6. Suggested cleanup order

1. **High confidence, user-visible legacy UI** — delete modal and `FoodSection` chains (Section 1).
2. **Dead utilities** — delete `validation.ts`, `useSearchView` / `debounce`, `sortTimelineTimeblocks` (Section 1).
3. **IPC wrapper trim** — remove unused renderer IPC functions; optionally remove matching main-process handlers (Section 2c).
4. **Dependency prune** — remove four unused Radix / react-hook-form packages (Section 3).
5. **Export hygiene** — drop unnecessary exports and test-only financial helpers (Section 2).
6. **Low priority** — trim shadcn barrel exports in `dialog.tsx` / `dropdown-menu.tsx` (Section 2a).

---

## 7. Verification commands

After cleanup:

```bash
npm run lint
npm run test
npm run build
npx fallow dead-code --format json --quiet 2>/dev/null || true
```

Re-run fallow to confirm issue counts drop. Expect some shadcn export warnings to remain unless you trim those barrels or add suppressions.
