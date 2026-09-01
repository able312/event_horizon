# Preview Redesign — Implementation Tracker

## Purpose

This doc tracks cross-session context, decisions, and progress for the preview/print-output redesign. Agents working on any phase should:

1. Read this whole doc before starting work.
2. Update the relevant phase section with what was done, decisions made, and anything the next phase needs to know.
3. Update **Status** and **Open Decisions** as you go — don't leave stale info for the next session.
4. Do not delete history from completed phases; append notes instead.

Background/context gathering for this effort was done in a prior chat session. See that discussion for the full codebase audit (routes, hooks, DB tables per preview type, and the current `parseBlock` markdown-ish syntax in `TimelineBlock.tsx`). This doc is the living plan going forward.

---

## Goals (from original request)

- Give the preview/print flow the same sidebar layout (`SplitLayout`) used by other views (Calendar, Event Detail) instead of the current toolbar-only `PreviewLayout`.
- Show per-preview-type options in the sidebar (options vary by preview type).
- Allow switching between preview types from within the layout, without leaving to the Generate menu.
- Upgrade note/details rendering from the current "almost markdown" syntax (`parseBlock` in `TimelineBlock.tsx`) to a simplified but real markdown syntax.
- Make that markdown parsing shared/reusable so any preview type (and potentially the editor) can render it consistently.
- Leave room to add new preview types/layouts later without re-architecting.

## Non-Goals

- No new DB tables are believed necessary for this work (confirmed during context-gathering). Revisit only if we decide to persist per-user preview preferences.
- Not attempting a WYSIWYG markdown editor in this pass — scope is parsing/rendering, not authoring UX (unless a later phase decides otherwise).

---

## Current State Snapshot (context-gathering findings)

- Preview routes: `/preview/timeline/:id`, `/preview/beo/:id`, `/preview/beo-food/:id`, `/preview/financial-report/:id`, all nested under `PreviewLayout` (`src/components/layouts/PreviewLayout.tsx`).
- `PreviewLayout` has no sidebar — just a toolbar (Back/Save PDF/Print) and a centered US Letter page rendering `<Outlet />`.
- Other views use `SplitLayout` (`src/components/layouts/SplitLayout.tsx`) with `PanelWrapper`/`BodyWrapper` + `Panel.Header/Content` and `Body.Header/Content`.
- Each preview type reuses existing React Query hooks (`useEvent`, `useFoodSection`, `useBeverageSection`, `useVendorSection`, `useNoteSection`, `useSetupInstructionSection`, `useTournamentDetailsSection`, `useCartDetailsSection`, `useMenuOfChargeItemsSection`, `usePaymentsSection`) — no preview-specific IPC layer exists.
- Markdown-ish parsing only exists in `TimelineBlock.tsx` (`parseBlock`): `## ` → header, `# ` → subtitle (inverted vs real markdown), blocks split on `\n\n`, no bold/italic/lists/links. BEO preview sections just render raw text in `<pre className="whitespace-pre-wrap">`.
- Free-text fields that would flow through a shared renderer: `events.clientNotes`, `events.internalNotes`, `timeblocks.details`, `food_items.includes`, `beverage_items.includes`, `tournament_details.notes`, `cart_details.whatGoesOnCarts`, `menu_of_charge_items.includes`, `payments.notes`.
- DB-generated content already uses the old syntax, e.g. tournament system timeline row: `` `## Details\n${numberOfPlayers} Players\n...` `` in `src/electron/db/repository/timeblocks.ts`. Migration/compat strategy needed for this.

---

## Phase Plan

### Phase 1 — Preview Shell (Sidebar Layout + Type Switching)

**Status:** Complete

**Scope:**
- Introduce a `SplitLayout`-based shell for previews (new `PreviewWorkspace` or similar), replacing/wrapping `PreviewLayout`.
- Sidebar: list of preview types for the current event, switchable without leaving the workspace.
- Body: existing toolbar (Back/Save PDF/Print) + print stage, keep current preview components as body content initially (no rendering changes yet).
- Decide routing shape (see Open Decisions).
- Extend `useGenerateMenuState` / `appMenu.ts` if needed so the app knows we're in a preview context.

**Notes for next phase:**
- Preview feature lives under `src/features/preview/` with thin route wrapper at `src/routes/Preview.tsx`.
- Routing is single route `/preview/:id?type=<slug>`; default type is `beo`. Helper: `buildPreviewPath()` and `resolvePreviewType()` in `src/features/preview/lib/previewTypes.ts`.
- `PreviewLayout.tsx` removed; toolbar/print stage moved to `PreviewBodyOrchestrator`.
- Preview page components relocated to `src/features/preview/pages/` (including BEO sections and tests).
- Event Detail sidebar: search moved into scroll region; preview entry icon added to header (left of Add Note).
- Generate menu + Financial workspace navigate using new URL shape.
- `useGenerateMenuState` now treats `/preview/:id` as event-details context so Generate menu stays available in preview.
- `SplitLayout.PanelWrapper` has `print:hidden` so sidebar is excluded from print/PDF output.
- Phase 2 can introduce shared markdown renderer and start replacing `<pre>` blocks in BEO sections.

---

### Phase 2 — Shared Markdown Module

**Status:** Complete

**Scope:**
- New module (proposed `src/lib/markdown/`) with:
  - A pure parser: `parsePreviewMarkdown(source: string) -> AST or block list`
  - A renderer component: `<PreviewMarkdownContent source={...} />`
- Define the simplified markdown subset supported (see Open Decisions).
- Decide compatibility/migration strategy for existing `#`/`##` content and DB-generated strings (e.g. tournament details synth string).
- Unit tests for the parser (pure logic — required per test policy).

**Notes for next phase:**
- Module lives at `src/lib/markdown/`:
  - `previewMarkdown.ts` — `parsePreviewMarkdown()` + `parseInlines()`
  - `PreviewMarkdownContent.tsx` — read-only renderer (`<PreviewMarkdownContent source={...} />`)
  - `legacyMarkdownMigration.ts` — `migrateLegacyHeadingSyntax()` for one-time DB migration
  - `previewMarkdown.test.ts` — parser + migration unit tests
- **Supported subset:** `#`/`##` headings, `**bold**`, `*italic*`, `***bold+italic***`, `---`/`***` hr, `* `/`- ` unordered lists, `1. ` ordered lists. No tables/images/links/quotes/code.
- **Heading scale:** print-appropriate, subtle hierarchy (h1: `text-sm font-bold uppercase`; h2: `text-xs font-bold`). One universal scale for all preview types for now.
- **Parser compat:** a heading line followed by body lines without a blank line (legacy `parseBlock` pattern) is split into heading + paragraph blocks automatically.
- **Field classification for Phase 3/4 rollout:**
  - **Markdown-capable:** `timeblocks.details`, `tournament_details.notes`, `cart_details.whatGoesOnCarts`
  - **Plain paragraph only (keep `<pre>`):** `food_items.includes`, `beverage_items.includes`, `menu_of_charge_items.includes`, `payments.notes`, `events.clientNotes`, `events.internalNotes`
- **Legacy migration:** tournament synth string in `timeblocks.ts` updated to `# Details\n...`. One-time script: `scripts/migrate-legacy-timeblock-markdown.ts` (dry-run by default, `--write` to persist). **Run once only** — back up DB first. Scoped to `timeblocks.details` only.
- **No render call sites changed yet** — BEO/Timeline still use `<pre>` / `parseBlock`. Phase 3 replaces BEO; Phase 4 replaces Timeline.

---

### Phase 3 — Roll Out Shared Rendering to BEO Sections

**Status:** Not started

**Scope:**
- Replace `<pre className="whitespace-pre-wrap">` usages in `src/routes/previews/beo/sections/*` and `EventOverviewHeader.tsx` with the shared renderer from Phase 2.
- Confirm visual output for all free-text fields listed in "Current State Snapshot."

**Notes for next phase:**
- _(fill in during/after implementation)_

---

### Phase 4 — Timeline Preview Rendering

**Status:** Not started

**Scope:**
- Replace `parseBlock`/`GenericDetailsBlock` custom parsing in `TimelineBlock.tsx` with the shared renderer.
- Decide whether the print/preview timeline should use read-only blocks instead of the current editable workspace components (`TimelineBlock` currently has editable time inputs).

**Notes for next phase:**
- _(fill in during/after implementation)_

---

### Phase 5 — Per-Preview-Type Sidebar Options

**Status:** Not started

**Scope:**
- Wire sidebar controls (from Phase 1 shell) to actual section/content toggles per preview type:
  - Full BEO: show contact info, toggle individual sections, tournament sections auto-hidden for non-tournament events.
  - Food BEO: show contact info, show internal notes.
  - Timeline: show internal notes, include system rows, read-only vs editable.
  - Financial: show payments table, show gratuity line, category visibility.
- Decide state scope: session-only (URL params/React context) vs persisted (would require schema change — currently a non-goal).

**Notes for next phase:**
- _(fill in during/after implementation)_

---

### Phase 6 — Polish / Extensibility Pass

**Status:** Not started

**Scope:**
- Consolidate duplicated sort-by-time logic across BEO sections into a shared util.
- Revisit pagination / page-break handling for print output.
- Confirm the shell makes it easy to add a new preview type/layout later (this was a stated future need).

**Notes for next phase:**
- _(fill in during/after implementation)_

---

## Open Decisions

Track unresolved questions here. Move resolved items to "Decisions Log" with the outcome.

- [x] **Routing shape:** single route `/preview/:eventId?type=beo` — implemented in Phase 1.
- [x] **Markdown subset:** `#`/`##` headings, bold/italic/bold+italic, hr (`---`/`***`), unordered (`* `/`- `) and ordered lists. No tables/images/links/quotes/code.
- [x] **Legacy syntax migration:** one-time data migration script for `timeblocks.details` (swap old `## `↔`# ` meaning); tournament synth string fixed in code. Run migration once with DB backup.
- [x] **Markdown library vs hand-rolled parser:** hand-rolled in `src/lib/markdown/` — zero new dependencies, full control over print-appropriate heading scale.
- [x] **Preview preferences persistence:** session-only for Phase 5 (React context). Planned prefs: contact-info visibility, internal-notes visibility, tournament-section auto-hide, timeline include-system-rows, financial payments/gratuity/category toggles. No schema change.
- [x] **Timeline preview editability:** read-only in preview/print output (Phase 4).

## Decisions Log

- **2026-08-31 — Routing shape:** Single route `/preview/:id?type=<slug>`, default `beo`. Rationale: shell mounts once, type switching is a query-param change without remounting workspace chrome.
- **2026-08-31 — Markdown subset:** Hand-rolled parser supporting headings, inline styles, lists, hr. Sub-item notes and event-level notes stay plain text.
- **2026-08-31 — Legacy migration:** One-time script swaps inverted `#`/`##` prefixes in `timeblocks.details`; synth tournament string fixed in repository code.
- **2026-08-31 — Preview editability:** Previews are read-only display output; no editing in preview mode.
- **2026-08-31 — Preview preferences:** Session-only (Phase 5); no DB persistence this iteration.

---

## Session Log

Append a brief entry each session so future agents know what happened and why, even if a phase isn't finished.

- **2026-08-31** — Initial context-gathering completed (routes, hooks, DB tables per preview type, existing `parseBlock` syntax audited). This tracking doc created. No implementation started yet.
- **2026-08-31** — Phase 1 complete: `PreviewWorkspace` shell with sidebar type switching, preview pages moved to `src/features/preview/pages/`, thin `src/routes/Preview.tsx` route, Generate menu + Event Detail preview entry updated, search moved in event sidebar.
- **2026-08-31** — Phase 2 complete: shared markdown module at `src/lib/markdown/` (parser, renderer, legacy migration util + script). Field classification documented for Phase 3/4. No preview render call sites changed yet.
