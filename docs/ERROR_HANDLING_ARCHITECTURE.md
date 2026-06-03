# Error Handling Architecture

This document defines the standard error-handling model for renderer routes and features.

## Goals

- Keep the UI usable and predictable when failures occur.
- Show blocking failures with explicit recovery actions.
- Keep non-blocking failures lightweight and local.
- Apply one consistent pattern across routes.

## Error Taxonomy

### `blocking-data-load`

Definition:
- Required route data cannot be loaded, so the route is not safely usable.

UX:
- Show a full-screen (route-scoped) recoverable error state.
- Include a clear Retry action.

Examples:
- Events workspace cannot load month/unscheduled events.

### `non-blocking-operation`

Definition:
- A user action failed, but the route can continue working.

UX:
- Show toast feedback.
- Keep user in-context without replacing the page.

Examples:
- Create/update/delete mutation failure.
- ICS commit failure while route still has valid data.

### `render-crash`

Definition:
- Unexpected React render/runtime exception in the route tree.

UX:
- Error boundary fallback for that route scope.
- Provide a simple recovery action (retry navigation / reload page).

## Ownership Rules

- Route owns:
  - render boundary placement
  - blocking data guard for route-critical data
- Feature hooks/components own:
  - non-blocking mutation/action error handling
  - local retries for non-blocking operations

## Recovery Contract

- Every `blocking-data-load` state must expose explicit Retry.
- Retry must refetch all route-critical queries needed to restore the route.
- Blocking states must use friendly copy; do not show raw technical errors in UI.

## Standard UI Contract: Route Blocking Error

Shared component contract:
- `title: string`
- `description: string`
- `onRetry: () => void | Promise<void>`
- `isRetrying?: boolean`

Behavior:
- Action button is disabled while retry is in-flight.
- Friendly message only.

## Implementation Checklist (Use for Every New Route/Feature)

1. Identify route-critical data sources.
2. Add route-level data guard for blocking failures.
3. Add explicit Retry for blocking state.
4. Ensure Retry refetches all route-critical queries.
5. Add route-scoped render `ErrorBoundary`.
6. Keep mutation/action failures non-blocking (toast/local UX).
7. Add tests for:
   - healthy render
   - blocking fallback render
   - retry behavior
   - render boundary fallback
8. Confirm UI copy is friendly and does not expose raw error details.

## Reference Adoption Notes

Baseline implementation is applied on Events route.

Reference files:
- `src/routes/Events.tsx`
- `src/features/calendar/CalendarWorkspace.tsx`
- `src/components/ui/route-blocking-error.tsx`
- `src/features/calendar/CalendarWorkspace.test.tsx`
- `src/routes/Events.test.tsx`
