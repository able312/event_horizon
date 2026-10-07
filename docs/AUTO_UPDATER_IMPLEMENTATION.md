# macOS updater implementation

The local implementation covers steps 2–5 of [AUTO_UPDATER_PLAN.md](AUTO_UPDATER_PLAN.md).
Step 1's local signing evidence is in [MACOS_SIGNING.md](MACOS_SIGNING.md).
The published `0.1.1` release was detected, downloaded, and installed through the
updater on both the build Mac and the second Mac (October 2, 2026). `0.1.2` and
`0.1.3` followed on October 5, 2026, the latter exercising this branch's updater
code (see acceptance results). Release CI
(step 7) is the follow-up phase.

## Behavior

- Real updates run only in packaged macOS arm64 apps, after successful database
  initialization and IPC registration. They check at startup and every six hours.
- Checks cannot replace a download, preparation, or ready state. Automatic
  downloads are enabled; installation on ordinary quit is disabled.
- A 100% progress event does not establish readiness. The `update-downloaded`
  completion event does, including cached downloads without progress events.
- Confirmation changes the status to preparing and calls Electron Updater's
  `quitAndInstall()`. macOS native staging begins at this point. Native failures
  or a two-minute preparation timeout return the status to ready, flagged as a
  failed install, so the update can be retried immediately without quitting.
  The handoff's install-on-download listener is removed on failure so a late
  native completion cannot unexpectedly close the app. If Squirrel finishes
  staging after that timeout, macOS applies the staged update on the next quit.
- A failed check (for example an offline startup) is logged and returns to idle
  without showing an error. Only a failed download shows the error indicator,
  which clears on the next scheduled check. Raw details stay in the local
  updater log.
- Development retains the simulation controls and cannot request real installation.
- The existing ready announcement, progress ring, restart dialog, and unsaved
  changes warning are reused. Cancelling the dialog leaves the app running.

`window.api.updater` exposes only `getStatus`, `onStatusChanged` (with a cleanup
function), and `restartAndInstall`. These channels are not added to the generic
bridge. Main validates the requesting window, top-level frame, exact renderer
entry URL, and absence of arguments. Install eligibility stays in main.

Each snapshot includes a monotonically increasing revision. The provider
subscribes before requesting a snapshot, ignores older revisions, and removes
its listener on unmount. Reloads and recreated windows retrieve the current state.

Diagnostics go to `updater.log` under Electron's logs directory. It rotates at
5 MiB into one `.previous` file, and logging failures do not interrupt event work.
This uses Node filesystem facilities without another logging dependency.

## Release workflow

Run these commands from a clean `main` checkout that exactly matches
`public/main`, using Node 22.16 or newer:

```sh
npm run release                       # default: patch
# Or: npm run release -- minor        # or major
npm run release:publish
```

`release` stops at a GitHub draft. Installed apps see the release only after
`release:publish`. Optionally install the draft DMG and inspect the app between
commands. Ordinary releases use `vX.Y.Z` tags; the Alpha badge does not enable a
prerelease feed.

### Prerequisites

- The remote is named `public` and points to the GitHub repository configured in
  `electron-builder.json`. Fetch and push URLs must agree. The script never
  assumes `origin`.
- `git`, `gh`, `npm` and installed dependencies are available. Authenticate with
  `gh auth login`; the script obtains the token through `gh auth token` and keeps
  it in memory. No token file or `.env` is needed.
- Building requires macOS arm64 and the `LNC Internal Signature` code-signing
  identity with its private key in an unlocked keychain. Provision keychain
  access before unattended builds. Publication does not require that identity.
- Both commands require clean, current `main`. If it is behind, run
  `git pull --ff-only public main` first. In a worktree setup, run releases from
  the checkout that owns `main`.

### Build to a draft

The script determines the version before doing any packaging:

| Current version on GitHub | Result |
| --- | --- |
| No release | Build that version, including retries after a merged bump |
| Incomplete or invalid draft | Rebuild and replace the draft at the same version |
| Complete, verified draft | Print/open its URL; keep the existing artifacts |
| Published release | Bump patch, minor or major |

A bump updates `package.json` and `package-lock.json` with
`npm version --no-git-tag-version`, commits to `release/vX.Y.Z`, opens a
`chore: bump version to X.Y.Z` PR, merges it and pulls `main`. A retry can reuse
an existing bump branch/PR. Required reviews or checks are respected: if merging
is blocked, the command prints the PR URL and stops. Resolve the requirements,
merge, pull `main`, then rerun. It does not enable auto-merge or bypass protection.

On the merged commit, the quality gate runs tests with two workers, lint and the
release-script TypeScript check; the production build runs once, inside packaging. Dependency audits are
excluded from this gate because of the existing findings recorded below.
Packaging reuses `dist:mac`, which rebuilds SQLite for Electron, transpiles the
main process, builds the renderer, and invokes
`electron-builder --mac --arm64 --publish never`. Output is isolated under
`dist/release-vX.Y.Z/`; stale output there is removed before rebuilding.

The explicit artifact name produces `Event-Horizon-X.Y.Z-arm64.dmg` and
`Event-Horizon-X.Y.Z-arm64.zip`, with matching `.blockmap` files. No manual rename
is needed. Electron Builder generates `latest-mac.yml` and the bundled
`app-update.yml` from the existing public GitHub provider configuration.

Before creating or replacing a draft, the script checks:

- Update metadata version, exact filenames, byte sizes and SHA-512 hashes.
- Both blockmaps are present and nonempty.
- Strict, deep signature verification of the ZIP-extracted and DMG-mounted apps,
  the expected authority and app identifier, hardened runtime, version and arm64.
- A launch of the ZIP-extracted app with a temporary user-data directory. The
  isolated database must be created, migrations must complete and the app must
  stay running for at least ten seconds; a slow first launch gets up to a minute.
  A DMG that will not detach is reported and left for manual cleanup instead of
  hiding the verification result.
  DNS is blocked for the smoke launch, keeping updater requests offline.

The draft targets the full source commit SHA. An existing remote tag, including
an annotated tag's peeled commit, must match that SHA; the script refuses to move
mismatched tags. It checks that an existing draft's source is an ancestor of
current `main` and contains the intended package version.

Drafts are found by listing releases, because GitHub's tag lookup omits drafts.
More than one release for the version stops the command. A draft whose target
is not a full commit SHA (for example, after editing it in the GitHub UI) is
rebuilt like an incomplete draft. Only a checked draft can be deleted for replacement. Published releases are
never deleted. The replacement gets generated release notes, then `gh release
upload` (allowed up to an hour) uploads exactly the DMG, ZIP, both blockmaps and `latest-mac.yml`. The
script checks the remote asset list and sizes against the local verified files,
prints the draft URL, opens it in interactive use, and exits.

### Publish the inspected draft

`release:publish` requires the current version's normal draft. It verifies the
source and tag SHA, downloads the uploaded files to a temporary directory, checks
metadata and artifact hashes/sizes, and rechecks that the draft has not changed.
It then runs `gh release edit vX.Y.Z --draft=false --latest`. No rebuild occurs,
so the uploaded artifacts are exactly the ones published. A complete-draft retry
uses the same remote verification; network/authentication failures stop without
rebuilding or replacing the draft. Downloads take additional time but also let
publication work without local build output.

Installed clients download anonymously from public releases on their next
startup/six-hour check, and restart only after the user's confirmation.
Credentials and certificate archives never belong in repository files or app
artifacts.

### Recovery and unattended use

A failed build or upload leaves the version reusable. Rerun `release` from clean,
current `main`. An incomplete draft is replaced only after the new build passes
verification. If the draft source has an existing tag at a different SHA, stop
and reconcile it manually; the script deliberately does not force-push tags.

If the version command or commit fails, the script discards the bump's
`package.json`/lockfile edits, returns to `main` and deletes the local release
branch; preflight's clean-tree check guarantees no other changes are lost. A
committed local bump whose push failed is kept and reused on retry from `main`.

A repository-wide lock prevents simultaneous local release commands. Normal
completion or failure removes it; after killing a process, remove the lock path
reported by the next run only once the old process has stopped. Coordinate
releases across different machines as well: GitHub does not offer an atomic
compare-and-publish operation. The commands require no terminal input themselves
and skip opening a browser when stdout is not a terminal or `CI=true`.

`npm run dist:mac` remains available for local packaging without GitHub changes.
Do not use the early signing-proof packages for a release: their version
overrides did not rebuild the sidebar version, and one proof omitted timestamps.
Normal builds still request trusted timestamps.

Existing databases with pending migrations are backed up under their `backups/`
directory before migrations run (`src/electron/db/migrationBackup.ts`). A backup
failure prevents migration and app startup. This workflow does not change schema
or migration behavior.

## Files and boundaries

- `scripts/release.ts`, `scripts/release-publish.ts`: separate build/draft and
  publication entry points, with git/GitHub orchestration.
- `scripts/release-logic.ts`: tested version, draft, SHA, metadata and asset rules.
- `scripts/release-artifacts.ts`: streamed hashing, signed ZIP/DMG verification
  and temporary-data launch checks; `scripts/release-commands.ts`: argument-based
  subprocess execution with timeouts.
- `scripts/release-logic.test.ts`, `scripts/release.test.ts`: pure validation and
  simulated workflow tests; `scripts/tsconfig.json`: strict script type checking.
- `electron-builder.json`, `package.json`, and `package-lock.json`: release feed,
  build commands, source version, and runtime dependency.
- `build/entitlements.mac.plist`: the existing certificate's signing requirements.
- `src/definitions/updater.ts`: shared status, revisioned snapshot, and bridge types.
- `src/definitions/electron.d.ts`: the renderer's explicit updater API type.
- `src/electron/services/updaterService.ts`: updater lifecycle and install eligibility.
- `src/electron/services/updaterLogger.ts`: bounded local diagnostics.
- `src/electron/ipcRoutes/updaterHandler.ts`: validated operations and broadcasts.
- `src/electron/main.ts`, `src/electron/preload.cts`: startup/shutdown and bridge wiring.
- `src/features/updater/state/synchronizeUpdater.ts`, `UpdaterProvider.tsx`, and
  `updaterReducer.ts`: authoritative state synchronization and reused UI reducer.
- `src/features/updater/lib/restartAndInstall.ts`: the real confirmation action.
- Adjacent tests cover service transitions, IPC validation, preload cleanup,
  snapshot races, Strict Mode remounts, restart/cancellation behavior, and logs.

The new modules isolate main-process orchestration, diagnostics, and renderer
synchronization from rendering. Existing updater components and reducer logic
were reused. No database schema or migration changes were needed.

## Automated verification

Release workflow verification (October 7, 2026):

- `npm run test -- --maxWorkers=2`: 135 files and 827 tests passed, including
  93 release validation/workflow tests.
- `npm run typecheck:release`, `npm run build` and `npm run lint`: passed;
  lint retains the three existing React Refresh warnings.
- Signed local packaging, both blockmaps, metadata, ZIP/DMG signatures and the
  isolated launch passed. Details are in [MACOS_SIGNING.md](MACOS_SIGNING.md).
- Real GitHub draft upload and publication are reserved for the next actual
  release; automated workflow tests simulate those operations without contacting
  GitHub.

Earlier updater verification:

- `npm run test -- --maxWorkers=2`: 133 files and 734 tests passed.
- `npm run build`: passed, including the strict Electron TypeScript check.
- `npm run lint`: passed with three existing React Refresh warnings.
- Updated Electron Updater's transitive `js-yaml` dependency to compatible patch
  `4.3.2`, removing its reported parser vulnerabilities from the packaged app.
- `npm audit`: 13 remaining findings (nine high, four moderate).
- `npm audit --omit=dev`: three remaining findings (two high, one moderate), in
  `nanoid`, `postcss`, and `react-router`. Those pre-existing findings remain
  separate remediation work.
- `npm run dist:mac`: completed with certificate signing, hardened runtime, and
  a trusted timestamp. The bundled `app-update.yml` selects the configured public
  GitHub repository. `latest-mac.yml` matches the ZIP and DMG hashes and sizes;
  both generated blockmaps are present. Strict signature verification passed
  for the unpacked bundle, ZIP extraction, and DMG copy.
- The updater-enabled signed `0.1.0` app remained running in an offline launch
  smoke test with a fresh user-data directory. Its isolated SQLite database passed
  `PRAGMA integrity_check`. Production event data was outside that smoke test.

Potential follow-up cleanup: review build-only packages currently present in
runtime dependencies to reduce packaging size. No dependencies were removed here.

## Acceptance results (October 2, 2026)

Signed `0.1.1` was published to GitHub and both Macs updated to it through the
updater without issues.

## Acceptance results (October 5, 2026)

- `0.1.2` contains the failed-check and failed-install fixes. The daily Mac
  updated to it from `0.1.1`, which exercised the `0.1.1` updater code.
- `0.1.3` was published so the `0.1.2` code could install an update. Its draft
  metadata matched the built ZIP's hash and size before publishing. The daily
  Mac updated from `0.1.2` to `0.1.3` through the updater. Turning Wi-Fi off
  during the update showed the download error; after relaunching online, the
  update downloaded, installed, and the app restarted on `0.1.3`. Development
  continues from `0.1.3` on `main`.

The following checks from step 6 of the plan have not been recorded as run:

- Cancelling the restart dialog, and an ordinary quit not installing the update.
- Event data persistence across the update on both Macs.
- Offline startup, renderer reload during download, and macOS window recreation.
- The second Mac's public-certificate fingerprint, and its launch result before
  the existing `xattr -cr` baseline-install workaround.

## Follow-up work

- Resolve/review the remaining dependency audit findings.
- Add release CI (step 7 of the plan).

Reference: [Electron Builder 26 auto-update guide](https://www.electron.build/v26/docs/features/auto-update/).
