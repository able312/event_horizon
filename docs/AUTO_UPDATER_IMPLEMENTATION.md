# macOS updater implementation

The local implementation covers steps 2–5 of [AUTO_UPDATER_PLAN.md](AUTO_UPDATER_PLAN.md).
Step 1's local signing evidence is in [MACOS_SIGNING.md](MACOS_SIGNING.md).
The published `0.1.1` release was detected, downloaded, and installed through the
updater on both the build Mac and the second Mac (October 2, 2026). Release CI
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

## Local builds and draft releases

The baseline source version is `0.1.0`. Before each actual release, update both
`package.json` and the lockfile to the new standard version and rebuild all assets.
Use a matching `v0.1.0`, `v0.1.1`, etc. tag on the corresponding committed source.
Use normal releases; the UI's Alpha badge does not enable a prerelease feed.

```sh
npm run test -- --maxWorkers=2
npm run build
npm run lint
npm audit
npm audit --omit=dev
npm run dist:mac
```

Packaging rebuilds SQLite for Electron after the Node test rebuild. Ordinary macOS
and Windows distribution commands explicitly use `--publish never`.

Electron Builder generates the bundled `app-update.yml` from the GitHub provider
configuration; the application does not construct feed URLs or set publishing
tokens. Verify `dist/latest-mac.yml`, DMG, ZIP, and both generated blockmaps.
Check that the metadata references the uploaded artifact names, that both bundle
and nested signatures verify, and that the packaged app launches.

Electron Builder's local files use `Event Horizon-…`; the GitHub publisher uses
the generated safe names `Event-Horizon-…` referenced by the metadata. The release
command handles this rename automatically. If uploading artifacts manually,
use the exact metadata names, including the blockmaps' corresponding names.

When ready to create the draft, provide `GH_TOKEN` in the build machine's shell
environment, then run:

```sh
npm run release:mac
```

This signs, builds, and uploads using `--publish always` with `releaseType: draft`.
Inspect the draft and its generated metadata/artifacts before publishing manually.
Installed clients download anonymously from public releases. Credentials and
certificate archives do not belong in repository files or app artifacts.

Do not use the early signing-proof packages for this release: their package
version overrides intentionally did not rebuild the sidebar version, and the B
proof omitted timestamps while Apple's service was failing. Normal builds still
request trusted timestamps.

## Files and boundaries

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

- `npm run test -- --maxWorkers=2`: 133 files and 732 tests passed.
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
