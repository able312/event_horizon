# Dashboard Insights Spec

Last Updated: 2026-04-23
Owner: Event Horizon
Status: Draft (ready for implementation)

## Purpose

Define a main-screen dashboard that surfaces operational risk and next actions, not just date-grouped event lists.

This spec only uses fields that already exist in:

- `events`
- `payments`
- `menu_of_charge_items`
- `timeblocks`
- `tournament_details`
- `cart_details`
- related satellite tables (`setup_instructions`, `vendor_items`, `food_items`, `beverage_items`)

No schema changes are required for MVP.

## Product Goals

- Help the operator immediately see what needs attention today.
- Reduce missed follow-ups (status drift, payment drift, detail-completeness drift).
- Prioritize events by urgency + business risk.
- Keep dashboard signal-focused and fast to scan.

## Non-Goals

- Replacing full calendar/list pages.
- Showing every event in chronological order as the primary dashboard UX.
- Perfect forecasting or AI predictions in MVP.

## Scope (MVP)

Create an "Insights" dashboard with:

- Top KPI strip (counts)
- Priority queue list (event-level actionable items)
- Insight sections (grouped by problem type)

Each insight row should include:

- Event title
- Event date (or "Unscheduled")
- Insight reason text
- Days to event (or days stale)
- Suggested next action
- Severity (`critical`, `high`, `medium`)

## Status Model Assumption

From schema enum ordering, active statuses are:

- `new_lead`
- `contacted`
- `ready_for_estimate`
- `estimate_sent`
- `estimate_confirmed`
- `agreement_sent`
- `agreement_and_deposit_received`
- `planning`
- `details_locked`
- `event_complete`
- `invoice_sent`
- `paid_in_full`

Terminal statuses:

- `closed`
- `lost`

For dashboard filters:

- "Active" means status not in (`closed`, `lost`).

## Insight Definitions

## 1) Upcoming Events At Risk

Problem:
Event date is approaching but planning status is behind.

Trigger:

- active event
- `start_date_time` is not null
- event is within next 14 days
- status in:
  - `new_lead`
  - `contacted`
  - `ready_for_estimate`
  - `estimate_sent`
  - `estimate_confirmed`
  - `agreement_sent`
  - `agreement_and_deposit_received`
  - `planning`

Severity:

- `critical` if <= 7 days
- `high` if 8-14 days

Suggested action:

- "Review and advance status toward `details_locked`."

## 2) Stalled Active Events

Problem:
Active event has had no recent updates and may be forgotten.

Trigger:

- active event
- `updated_at` is null and `created_at` older than 10 days, or
- `updated_at` older than 10 days

Severity:

- `high` if stale > 20 days
- `medium` if 10-20 days

Suggested action:

- "Open event and confirm next step or close as lost/closed."

## 3) Unscheduled Active Events

Problem:
Pipeline items exist with no scheduled date.

Trigger:

- active event
- `start_date_time` is null

Severity:

- `high` if status at or beyond `estimate_sent`
- `medium` otherwise

Suggested action:

- "Assign tentative event date or explicitly park the lead."

## 4) Missing Client Contact For Active/Upcoming Events

Problem:
Cannot reliably follow up when key contact fields are missing.

Trigger:

- active event
- and (`client_name` is null/empty OR `client_email` is null/empty OR `client_phone` is null/empty)
- optional tighter filter for MVP list size: only include events with date in next 60 days OR unscheduled statuses up to `agreement_sent`

Severity:

- `high` if event within 30 days
- `medium` otherwise

Suggested action:

- "Capture missing contact details before next milestone."

## 5) Estimate Readiness Gap

Problem:
Event is in estimate workflow but no charge items exist.

Trigger:

- active event
- status in (`ready_for_estimate`, `estimate_sent`, `estimate_confirmed`)
- zero related rows in `menu_of_charge_items`

Severity:

- `high` if event within 21 days
- `medium` otherwise

Suggested action:

- "Add menu/charge items to complete estimate scope."

## 6) Agreement/Deposit Risk

Problem:
Event progressed into agreement stages without recorded payment.

Trigger:

- active event
- status in (`agreement_sent`, `agreement_and_deposit_received`, `planning`, `details_locked`)
- zero related rows in `payments`

Severity:

- `critical` if event within 14 days
- `high` otherwise

Suggested action:

- "Follow up on deposit/payment and log payment entry."

## 7) Details Locked Quality Check

Problem:
Status says "details locked" but operational details look incomplete.

Trigger:

- status = `details_locked`
- and any of:
  - zero related `timeblocks`
  - no `setup_instruction`-type timeblock
  - timeblocks exist with null/empty `assigned_to`
  - event type `tournament` and missing `tournament_details` or `cart_details`

Severity:

- `critical` if event within 7 days
- `high` otherwise

Suggested action:

- "Resolve missing execution details before event day."

## 8) Tournament Incompleteness

Problem:
Tournament event is missing core tournament-specific records.

Trigger:

- `events.type = tournament`
- active event
- missing row in `tournament_details` OR missing row in `cart_details`

Severity:

- `high` if event within 30 days
- `medium` otherwise

Suggested action:

- "Complete tournament + cart detail records."

## 9) Final Guest Count Not Locked Near Event

Problem:
Event is near date but final guest count is not confirmed.

Trigger:

- active event
- `start_date_time` within 14 days
- `guest_count_final` not marked final (not equal to `1`)

Severity:

- `high` if <= 7 days
- `medium` if 8-14 days

Suggested action:

- "Confirm and lock final guest count."

## 10) Post-Event Billing Backlog

Problem:
Completed events are not moving through invoice/payment closure.

Trigger:

- status = `event_complete`
- event date older than 3 days
- status not advanced to `invoice_sent`, `paid_in_full`, or `closed`

Severity:

- `high` if > 7 days past event
- `medium` if 3-7 days past event

Suggested action:

- "Send invoice and progress event to financial closure statuses."

## KPI Strip (Top Row)

Display compact counts:

- `Critical issues`: total insight rows with `critical`
- `Upcoming at risk (14d)`: count from Insight #1
- `Stalled events`: count from Insight #2
- `Deposit risk`: count from Insight #6
- `Billing backlog`: count from Insight #10

Clicking a KPI should filter the priority queue to that insight type.

## Priority Queue Ranking

Combine all triggered insights into one queue sorted by:

1. Severity rank (`critical` > `high` > `medium`)
2. Time urgency (`days_to_event` ascending, nulls last)
3. Staleness (`days_since_update` descending)
4. Creation recency (`created_at` ascending for unresolved backlog visibility)

If one event has multiple insights:

- Keep separate rows in section views.
- In the global queue, collapse to one row per event with "N issues" badge, expand on click.

## Suggested Dashboard Layout

- Section A: KPI strip
- Section B: "Priority Queue" (single sorted actionable list)
- Section C: Insight group panels
  - Upcoming at risk
  - Financial risks (deposit + billing)
  - Data completeness risks (contact, schedule, details locked checks)
  - Stalled work

## Data Retrieval Notes

- Build insight queries in DB repository layer, not renderer.
- Prefer one query per insight for clarity in MVP.
- Return normalized payload:
  - `eventId`
  - `eventTitle`
  - `eventType`
  - `eventStatus`
  - `startDateTime`
  - `insightType`
  - `severity`
  - `reason`
  - `suggestedAction`
  - `daysToEvent`
  - `daysStale`

## Time Handling Rules

- Compute date windows in local timezone consistently.
- Treat `start_date_time` as ISO string from DB and normalize before comparisons.
- Do not mix UTC/day-boundary assumptions between insights.

## Empty States

- If no critical/high items:
  - show "No urgent issues" with count of medium insights.
- If no insights at all:
  - show "All clear" and quick links:
    - Create event
    - Review upcoming month

## Acceptance Criteria (MVP)

- Dashboard shows only actionable insight content, not plain chronological list as primary UI.
- Every insight row includes a clear reason and next action.
- Severity and sorting are consistent with this spec.
- Clicking an insight opens the relevant event detail.
- No schema migration is required.

## Out of Scope (MVP)

- Auto-reminders/notifications.
- SLA configuration UI for threshold days.
- ML-based risk scoring.
- Multi-user assignment workflows.
