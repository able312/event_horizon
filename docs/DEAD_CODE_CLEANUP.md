# Dead Code Cleanup Record

Verified and completed: 2026-10-08.

The original 2026-07-04 inventory was stale. Every candidate was checked against current production and test callers before removal. Keep live code even when an older inventory or static analysis marks it unused.

## Completed cleanup

### Deleted files

| Area | Removed files |
|---|---|
| Legacy food UI | `src/components/event-detail/detail-sections/sections/FoodSection.tsx` and its test; `src/components/atoms/DetailsTimeblock.tsx`; `src/components/atoms/GenericItemCard.tsx` and its test |
| Orphaned search hook | `src/hooks/util/useSearchView.ts` and its test |
| Unused validation stub | `src/electron/db/validation.ts` |
| Legacy client UI | `src/features/event-detail/sections/event-overview/components/ClientDetailsCard.tsx`; its now-orphaned `lib/formatClientDetailsPlainText.ts` and test |
| Unused compatibility modules | `src/features/event-detail/workspace/lib/getWorkspaceCategoryIdForSectionType.ts`; `src/features/touchpoints/lib/buildCommonTouchpoints.ts` |
| Unused test helper | `src/test/renderWithProviders.tsx` |

### Partial cleanup

- Removed the unused `getAllEvents` renderer wrapper and four unused wrappers each from `cartDetails.ts` and `tournamentDetails.ts`. Updated IPC contract cases and stale test mocks. Existing main-process handlers and repository methods remain intact.
- Removed `buildEventDetailNavigationPath`, `toNoteEditorPath`, `toCategoryPath`, and the unused navigation-policy lookup and compatibility alias. Removed only tests of the deleted helper; current routing and legacy URL canonicalization tests remain.
- Removed the test-only `computeFinancialSummary`, `computeCategorySubtotalCents`, and `computeAllChargesSubtotalCents` helpers. Made food, beverage, and gratuity helpers internal. Financial tests exercise `computeFinancialSummaryAllSources`, including missing source data and nullable fields.
- Made Google Calendar date and description helpers internal. Their tests verify the generated URL's dates and details through the production URL builders.
- Removed unused dialog and dropdown components/exports while retaining the internal dialog portal and overlay.
- Standardized calendar sidebar forms on their existing default exports and updated their tests.
- Removed unused preview aggregate components (`BeverageDetails`, `FoodDetails`, `NoteDetails`, `SetupInstructionDetails`) and `SectionHeading`. Kept the individual detail components used by paginated previews.
- Removed unused beverage normalization code and redundant types. Current repository operations and the canonical database `BeverageItemType` remain.
- Removed unused types and re-exports in database, calendar, navigation, touchpoints, preview preferences, and updater modules. Kept locally used types, constants, helper functions, and default-exported components while removing their unused named exports.
- Removed the obsolete `@tailwindcss/line-clamp` plugin reference. Current `line-clamp-2` usage is supported natively by Tailwind v4.

### Dependencies removed

Removed `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-switch`, and `react-hook-form`: none has a current import or component consumer.

Also removed `drizzle-zod` and `zod`: the deleted validation stub was the only importer of `drizzle-zod`, and no current source imports `zod`. Updated the lockfile without upgrading other packages.

## Preserved live code and testing APIs

| Candidate | Reason to keep |
|---|---|
| `src/lib/debounce.ts` / `useDebounceValue` | Used by `ContactsDirectoryWorkspace` and `AddEventContactForm` |
| `DropdownMenuCheckboxItem` | Used by `BeverageWorkspaceSection` |
| `DropdownMenuSeparator` | Used by contact-directory and event-contact menus |
| `parseHotkeyCombo` and `toError` exports | Direct focused unit tests cover parsing and error normalization; the original inventory permits retaining these testing APIs |
| Electron main/preload, IPC handlers, repositories | Live desktop entry points and handler registration chains; Fallow's default entry-point inference misses Electron main |
| `FoodWorkspaceSection`, `useFoodSection`, financial summary and preview detail components | Current editing and printing paths |

## Verification

- `npm run lint`: passes with three existing Fast Refresh warnings in `button.tsx` and `SplitLayout.tsx`.
- `npm run test`: full repository suite passes; deleted tests covered removed code only.
- `npm run build`: Electron type checking, renderer TypeScript compilation, and production Vite build pass.
- `npm audit` and `npm audit --omit=dev`: no vulnerabilities.
- Fallow 3.32.0, with explicit renderer, Electron main/preload, and release-script entry points: no unused files, exports, types, or runtime dependencies.

For reproducible analysis without adding a dependency or repository config:

```bash
cat > /tmp/event-horizon-fallow-config.json <<'JSON'
{
  "entry": [
    "src/main.tsx",
    "src/electron/main.ts",
    "src/electron/preload.cts",
    "scripts/release.ts",
    "scripts/release-publish.ts"
  ]
}
JSON
npx --yes fallow@3.32.0 dead-code \
  --config /tmp/event-horizon-fallow-config.json --format json --quiet
```

Three findings remain for manual interpretation; the duplicate-export finding makes Fallow exit nonzero:

| Finding | Disposition |
|---|---|
| `postcss` unused dev dependency | Retained as build tooling; Tailwind/Vite use PostCSS transitively, and the direct dependency specifies the patched version range |
| `@tailwindcss/vite` test-only dependency | False positive: imported by the production Vite configuration |
| Duplicate `updateBeverageItem` export names | Both live: one updates the optimistic cache, the other invokes IPC; they belong to separate modules |

No new application abstractions were introduced. Existing workspace, contact, preview, routing, and financial APIs remain the active paths. Future cleanup can revisit the legacy Tailwind/shadcn configuration separately.
