# Local macOS signing proof

This records the first stage of [AUTO_UPDATER_PLAN.md](AUTO_UPDATER_PLAN.md).
The initial packages in `dist/signing-proof-a` and `dist/signing-proof-b` were
built before updater integration. They are signing proofs, not an updater-enabled
baseline. Do not publish them as update releases. Current updater behavior and
release instructions are in [AUTO_UPDATER_IMPLEMENTATION.md](AUTO_UPDATER_IMPLEMENTATION.md).

## Build configuration

`npm run dist:mac` rebuilds SQLite for Electron, compiles the app, and produces
arm64 DMG and ZIP packages under `dist/`. It explicitly uses `--publish never`.
The GitHub feed is configured for public releases in `able312/event_horizon`.
`npm run release:mac` is the separate command that uploads to a draft release.

The app identifier stays `com.latenightcreation.event-horizon`. macOS packaging
requires the `LNC Internal Signature` identity and uses `forceCodeSigning: true`
to fail when that identity is unavailable. Hardened runtime remains enabled.
`build/entitlements.mac.plist` supplies the entitlements for the app and nested
binaries. Notarization is outside this phase.

The entitlements allow V8 JIT and disable library validation. The latter is
required by this self-signed certificate, which has no Apple Team ID: a local
launch with JIT alone failed because dyld rejected Electron Framework with a
Team ID mismatch. Hardened runtime and certificate signing remain enabled;
unsigned executable memory is not enabled.

## Verify the certificate on both Macs

On the build Mac, confirm the private key is available:

```sh
security find-identity -v -p codesigning
```

On each Mac, inspect the public certificate:

```sh
security find-certificate -c 'LNC Internal Signature' -p |
  openssl x509 -noout -fingerprint -sha256 -dates
```

The certificate inspected on the build Mac on October 1, 2026 has SHA-256
fingerprint:

```text
CE:28:BF:B4:4F:06:DA:80:05:92:75:F6:7E:67:B9:AC:8A:32:6B:56:7F:5E:89:96:55:73:EE:BB:F7:48:F4:D7
```

It expires September 30, 2027. Confirm the second Mac has this exact public
certificate and trusts it for code signing. Matching names alone are insufficient.
Only the build Mac needs the private key. Do not store certificate archives or
passwords in the repository.

The second Mac currently needs `xattr -cr '/Applications/Event Horizon.app'` to
open a manually copied app. This recursively clears all extended attributes,
including quarantine. It does not establish certificate trust or prove that
Squirrel can verify and install an update. Record the launch result before this
command during the two-Mac acceptance check, then verify the update path after
the manual baseline installation. Do not disable Gatekeeper globally.

## Inspect a package

After `npm run dist:mac`:

```sh
codesign --verify --deep --strict --verbose=2 'dist/mac-arm64/Event Horizon.app'
codesign --display --verbose=4 'dist/mac-arm64/Event Horizon.app'
codesign --display --requirements - 'dist/mac-arm64/Event Horizon.app'
codesign --display --entitlements - 'dist/mac-arm64/Event Horizon.app'
lipo -archs 'dist/mac-arm64/Event Horizon.app/Contents/MacOS/Event Horizon'
```

Require the expected identifier, `Authority=LNC Internal Signature`, hardened
runtime (`runtime` in the signing flags), and `arm64`. An ad hoc signature is a
failed proof even if `codesign --verify` accepts it. Verify the app extracted from
the ZIP and the app mounted from the DMG as well.

## Compare two signed versions

After the compiled assets exist, create two isolated signing proofs:

```sh
npx --no-install electron-builder --mac --arm64 --publish never \
  -c.extraMetadata.version=0.1.0 -c.directories.output=dist/signing-proof-a
npx --no-install electron-builder --mac --arm64 --publish never \
  -c.extraMetadata.version=0.1.1 -c.directories.output=dist/signing-proof-b
```

These overrides change the packaged version only; the sidebar still uses the
source `package.json` version. They are suitable for comparing signatures, not
for the real update acceptance test. Actual releases must set `package.json`
and the lockfile to the intended version and rebuild the renderer.

Save A's designated requirement and test B against it:

```sh
codesign --display --requirements - \
  'dist/signing-proof-a/mac-arm64/Event Horizon.app' \
  > dist/signing-proof-a/requirements.txt
sed -n 's/^designated => //p' dist/signing-proof-a/requirements.txt \
  > dist/signing-proof-a/designated-requirement.txt
codesign --verify --deep --strict \
  --test-requirement dist/signing-proof-a/designated-requirement.txt \
  'dist/signing-proof-b/mac-arm64/Event Horizon.app'
```

Inspect each bundle's `CFBundleShortVersionString` and `CFBundleIdentifier` with
`plutil` as well. This static compatibility check must pass before attempting a
real updater installation. It cannot replace the installation test on both Macs.

## Local verification results (October 1, 2026)

- Built `0.1.0` with the configured identity and a trusted timestamp. Strict
  verification passed for the bundle, nested code, ZIP extraction, and DMG copy.
- Extracted the bundle's signing certificate and confirmed its SHA-256 fingerprint
  matches the certificate above. The app is arm64 and has hardened runtime enabled.
- Built `0.1.1` with the same identity and identifier. B satisfies A's designated
  requirement under `codesign --verify --deep --strict --test-requirement`.
- Apple's timestamp service repeatedly failed during B's builds. For the local
  static proof only, B was built with `-c.mac.timestamp=none`. The repository's
  normal packaging configuration still requests timestamps. A fully timestamped
  B remains to be verified before the release acceptance test.
- A signed Electron runtime loaded packaged SQLite and queried an in-memory
  database successfully. The completed A package stayed running through a
  ten-second launch smoke test using a fresh `--user-data-dir`; its database was
  created there, keeping the production database outside the smoke test.
- Electron Builder rejected a deliberately missing identity with mandatory
  signing enabled; it did not fall back to unsigned output.
- `npm run build` passed. `npm run lint` passed with three existing warnings.
- Full test runs encountered worker/test timeouts. The run with two workers
  reported 701 passing tests, one timeout, and one worker-start timeout. The
  affected test files and the earlier worktree timeout passed on an isolated
  rerun (three files, nine tests). A clean full-suite run remains outstanding.
- Dependency audits reported 14 existing findings, including three in the
  production audit. No dependencies or lockfile entries changed in this stage.

## Remaining acceptance work

- Confirm the second Mac's certificate fingerprint and code-signing trust.
- Record quarantine and Gatekeeper behavior on that Mac.
- Back up event data, manually install the updater-enabled baseline, and test a
  published newer version on both Macs as described in the plan.

Configuration reference: [Electron Builder 26 macOS options](https://www.electron.build/v26/docs/mac/).
