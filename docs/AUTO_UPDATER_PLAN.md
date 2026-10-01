# macOS auto-updater implementation plan

## Agreed behavior and scope

- Use `electron-updater` with public GitHub releases in `able312/event_horizon`.
- Support macOS arm64 only initially; remove Intel targets from the macOS configuration.
- Check after successful app startup and every six hours while the process is running.
- Follow patterns from the demo UI that has already been put in place:
- Keep the sidebar empty when checking or up to date.
- Download available updates automatically in the background and use the existing progress UI.
- Preserve the existing subtle ready announcement and restart confirmation.
- After download, an install may happen on the next fresh restart if the user doesn't explicitly click "update now".
- Use the existing local signing certificate, `LNC Internal Signature`. Apple Developer membership and notarization are outside this scope.

## Release recommendation

Start with builds signed locally on the existing Mac, uploaded to a draft GitHub release, and published manually once its artifacts have been checked. This exercises the current certificate and client trust setup without also introducing CI keychain configuration.

Once an update succeeds on both Macs, automate the same build and artifact validation with GitHub Actions. A version tag should trigger the build and upload to a draft release; manually publishing that draft remains the point at which clients receive the update.

## Repository findings

- `UpdaterProvider` currently owns renderer-only state; development controls simulate updates.
- `restartAndInstall.ts` currently shows a placeholder toast.
- The reducer and UI already cover idle, checking, downloading, preparing, ready, and error states.
- Preload currently exposes an allowlisted IPC bridge. New updater operations should have explicit, typed methods without expanding access to arbitrary channels.
- The macOS build currently produces a DMG only, has `publish: null`, and selects ad hoc signing with `identity: "-"`.
- The locally installed `/Applications/Event Horizon.app` is also ad hoc signed. It needs one manual replacement with a certificate-signed, updater-enabled baseline.
- The production database lives under Electron's user-data directory. Existing startup logic backs it up before pending migrations and aborts startup if migration fails.

## Implementation sequence

### 1. Prove the certificate and packaging path

Confirm that the second Mac trusts the same exported certificate, comparing fingerprints rather than names. A separately created certificate with the same name is a different identity.

Configure a locally signed arm64 DMG and ZIP using the existing certificate, with signing required so the build cannot silently fall back to unsigned or ad hoc output. Inspect the app's designated requirement, nested signatures, and launch behavior. Preserve hardened runtime and configure only the entitlements required by the actual Electron build.

Build two distinct versions with the same certificate and app identifier. Verify that the second build satisfies the first build's signing requirement, then complete a real updater installation during step 6. Static verification alone does not prove Gatekeeper, quarantine, or Squirrel installation behavior on the second Mac. If this fails, diagnose the specific trust/signature failure before broadening the implementation.

### 2. Configure update artifacts and a repeatable local release

Update `electron-builder.json` to produce arm64 DMG and ZIP targets, use the real signing identity, and explicitly select GitHub owner `able312` and repo `event_horizon`. Let Electron Builder generate the bundled `app-update.yml` feed configuration and release metadata; do not manually construct the feed URL.

Add `electron-updater` as a runtime dependency and update the lockfile. Use its stable 6.x API compatible with the existing Electron Builder 26.x setup and the project's ESM main process. No additional logging dependency is needed initially.

Keep ordinary packaging explicitly non-publishing. Add a separate local release command that signs, builds, and uploads artifacts into a draft release. Publishing credentials belong only on the build machine; installed clients use anonymous public downloads.

Use increasing standard versions, initially `0.1.0` and `0.1.1`, with matching `v0.1.0` and `v0.1.1` tags. Use one normal release feed initially; the UI's Alpha badge does not require GitHub prerelease channels. A release must contain the generated `latest-mac.yml`, ZIP, DMG, and generated blockmaps, with metadata referencing the actual uploaded files.

### 3. Add the main-process updater service

Create a focused service under `src/electron/services` that owns updater listeners, the current status, check/download concurrency, and the six-hour timer. Initialize it after successful database startup and IPC registration. Enable real updates only for packaged macOS arm64 builds; development keeps its simulation controls.

Use automatic downloads and disable automatic installation on quit. Prevent scheduled checks from replacing a downloading, preparing, or ready status. Handle rejected check/download promises as well as emitted errors, and recover on the next scheduled check without interrupting event work. Stop timers and detach application-owned listeners during shutdown.

Map checking to `checking`, no available update to `idle`, availability/progress to `downloading`, and completion work to `preparing`. Mark the downloaded package `ready` when `quitAndInstall()` can be requested. Do not infer readiness merely from a 100% progress event; cached downloads may also skip progress events entirely.

Important macOS detail: with `autoInstallOnAppQuit = false`, Electron Updater defers the native Squirrel staging/verification handoff until `quitAndInstall()` is requested. After confirmation, show `preparing` during that handoff and let the package manage installation/restart. Do not wait for native staging before showing the initial ready button, since staging has not started at that point. Handle native preparation errors without quitting the app or leaving an indefinitely spinning indicator.

Keep full diagnostic details in local updater logs using Node/Electron facilities, and expose friendly messages to the renderer.

### 4. Connect main, preload, and the existing UI

Move the shared updater status contract into `src/definitions` so the main process does not import renderer state modules. Reuse the existing reducer, announcement logic, provider, progress indicator, and confirmation dialog.

Add an updater IPC handler and explicit typed preload methods for reading status, subscribing to status changes with cleanup, and requesting restart/install. Validate the requesting window and reject unexpected arguments. Main owns feed configuration, downloaded file paths, and install eligibility; the renderer supplies neither URLs nor installer paths.

Have `UpdaterProvider` subscribe and retrieve a current snapshot. Make synchronization resistant to a stale snapshot arriving after a newer event, so renderer reloads, route navigation, Strict Mode remounts, and macOS window recreation recover the actual state without duplicate listeners.

Replace the restart placeholder with the preload operation. Main rechecks that an update is ready and accepts only one install request. Retain the existing unsaved-changes warning. Show friendly feedback if the request fails. Keep simulated updates isolated from real installation in development.

### 5. Verify automated behavior

Add meaningful tests for the main service and IPC handlers, preload subscription cleanup, renderer synchronization, and restart orchestration. Extend existing reducer tests only where behavior changes; no render-only component tests are needed.

Cover startup and six-hour checks, no-update results, automatic downloads, cached downloads, progress/completion ordering, concurrent requests, preservation of ready status, network errors and recovery, install-before-ready rejection, duplicate install requests, normal quit without installation, and native preparation failure after confirmation.

Run `npm run test`, `npm run build`, `npm run lint`, `npm audit`, and `npm audit --omit=dev`. Rebuild `better-sqlite3` for Electron before packaged smoke testing, since the test command rebuilds it for Node.

### 6. Complete the two-version update on both Macs

Preserve a database backup before the first real installation. Manually install signed baseline A, then publish signed version B with all generated artifacts to GitHub.

Confirm that A detects B, downloads it in the background, shows progress/preparation and the existing ready announcement, and remains usable until confirmation. Verify that cancelling the dialog keeps the app running, ordinary quit does not install B, and confirming installs/restarts into B. Verify sidebar version and database persistence after restart on both machines.

Also exercise offline startup, closing/reopening the macOS window, and a renderer reload during download. Mocked tests cannot replace this acceptance check for the self-signed certificate setup.

### 7. Automate releases after the local path passes

Add a macOS GitHub Actions workflow using Node 22, a compatible arm64 build environment, the lockfile, and the same release commands. Validate the tag against `package.json`, run quality checks, rebuild the native SQLite dependency for Electron, sign, verify artifacts, and upload to a draft release.

Export the signing identity including its private key into an encrypted certificate archive for CI secrets. Reproduce the custom certificate's trust setup in a temporary CI keychain; do not assume importing the archive establishes trust. Keep certificates and passwords out of the repository and app artifacts. Give the release job only the GitHub permissions it needs.

Keep manual publication initially. CI replaces the build/upload work, while the application's update behavior and feed stay the same.

## Completion criteria

The macOS phase is complete when a locally signed arm64 build updates to a newer public GitHub release on both trusted Macs through the existing UI, installs only after confirmation, and retains event data. Automated publishing is the follow-up phase after that proof.

## References

- [Electron Builder 26 auto-update guide](https://www.electron.build/v26/docs/features/auto-update/)
- [Electron Builder 26 publishing configuration](https://www.electron.build/v26/docs/publish/)
- [Squirrel.Mac code-signature verification](https://github.com/Squirrel/Squirrel.Mac/blob/main/Squirrel/SQRLCodeSignature.m)
- [Electron Updater 6.8.9 macOS handoff and install behavior](https://github.com/electron-userland/electron-builder/blob/electron-updater%406.8.9/packages/electron-updater/src/MacUpdater.ts)
