// @vitest-environment node
import { describe, expect, it } from "vitest"
import { ArtifactValidationError, assertDraft, assertTagSha, assertUnchangedDraft, assertVersion, assertVersionOnlyBump, decideVersion, expectedAssetNames, githubRepository, parseMetadata, verifyAssets, verifyFiles } from "./release-logic.ts"
import type { FileInfo, Release } from "./release-logic.ts"

const version = "1.2.3"
const sha512 = Buffer.alloc(64, 1).toString("base64")
const files: FileInfo[] = [
  { name: `Event-Horizon-${version}-arm64.zip`, size: 123, sha512 },
  { name: `Event-Horizon-${version}-arm64.dmg`, size: 456, sha512 },
]
const yaml = `version: ${version}
files:
  - url: ${files[0].name}
    sha512: ${sha512}
    size: 123
  - url: ${files[1].name}
    sha512: ${sha512}
    size: 456
path: ${files[0].name}
sha512: ${sha512}
releaseDate: '2026-10-07T12:00:00.000Z'
`
const metadata = { version, files }
const assets = expectedAssetNames(metadata).map((name) => ({ name, size: files.find((file) => file.name === name)?.size ?? 10, state: "uploaded" }))
const draft: Release = { id: 1, tag_name: `v${version}`, draft: true, prerelease: false, target_commitish: "a".repeat(40), html_url: "https://github.com/owner/repo/releases/1", assets }

describe("version decisions", () => {
  const packageJson = (version: string, extra = {}) => JSON.stringify({ version, scripts: { test: "vitest" }, ...extra })
  const lockJson = (version: string) => JSON.stringify({ version, packages: { "": { version }, sqlite: { version: "12.0.0" } } })
  it("reuses a branch only when its package and lockfile changes are version-only", () => {
    expect(() => assertVersionOnlyBump(packageJson("1.2.2"), lockJson("1.2.2"), packageJson(version), lockJson(version), version)).not.toThrow()
    expect(() => assertVersionOnlyBump(packageJson("1.2.2"), lockJson("1.2.2"), packageJson(version, { scripts: { test: "skip" } }), lockJson(version), version)).toThrow("beyond")
    expect(() => assertVersionOnlyBump(packageJson("1.2.2"), lockJson("1.2.2"), packageJson(version), lockJson(version).replace("12.0.0", "13.0.0"), version)).toThrow("beyond")
    expect(() => assertVersionOnlyBump(packageJson("1.2.2"), lockJson("1.2.2"), packageJson(version), lockJson("1.2.2"), version)).toThrow("intended version")
  })
  it.each(["patch", "minor", "major"] as const)("keeps an unreleased version for %s", (bump) => {
    expect(decideVersion(version, bump, null)).toBe(version)
  })
  it.each(["patch", "minor", "major"] as const)("keeps a draft version for %s, even after a partial upload", (bump) => {
    expect(decideVersion(version, bump, { ...draft, assets: [] })).toBe(version)
    expect(decideVersion(version, bump, draft)).toBe(version)
  })
  it.each([["patch", "1.2.4"], ["minor", "1.3.0"], ["major", "2.0.0"]] as const)("bumps a published release by %s", (bump, next) => {
    expect(decideVersion(version, bump, { ...draft, draft: false })).toBe(next)
  })
  it.each(["1.2.3-beta.1", "v1.2.3", "01.2.3", "1.2", "1.2.3.4", "-1.2.3", "9007199254740992.0.0"])("rejects unsupported version %s", (invalid) => {
    expect(() => assertVersion(invalid)).toThrow()
  })
  it("accepts zero versions", () => expect(() => assertVersion("0.0.0")).not.toThrow())
  it("rejects an unrelated release", () => {
    expect(() => decideVersion(version, "patch", { ...draft, draft: false, tag_name: "v9.9.9" })).toThrow()
  })
})

describe("draft and source safety", () => {
  it("ignores download counts and asset order when checking for draft changes", () => {
    const before = { ...draft, assets: assets.map((asset) => ({ ...asset, download_count: 0 })) }
    const after = { ...draft, assets: assets.toReversed().map((asset) => ({ ...asset, download_count: 1 })) }
    expect(() => assertUnchangedDraft(before, after, version)).not.toThrow()
  })
  it.each([
    { ...draft, id: 2 },
    { ...draft, target_commitish: "b".repeat(40) },
    { ...draft, assets: [] },
    { ...draft, assets: assets.map((asset) => ({ ...asset, id: 99 })) },
    { ...draft, assets: assets.map((asset) => ({ ...asset, digest: "sha256:changed" })) },
    { ...draft, assets: assets.map((asset) => ({ ...asset, updated_at: "changed" })) },
    { ...draft, draft: false },
  ])("stops if the draft or its artifacts changed during verification", (after) => {
    expect(() => assertUnchangedDraft(draft, after, version)).toThrow()
  })
  it("accepts only a normal draft with the intended tag", () => expect(() => assertDraft(draft, version)).not.toThrow())
  it.each([null, { ...draft, draft: false }, { ...draft, prerelease: true }, { ...draft, tag_name: "v9.9.9" }])("refuses missing, live, prerelease or unrelated releases", (release) => {
    expect(() => assertDraft(release, version)).toThrow()
  })
  it("accepts an absent tag and a tag at the exact build commit", () => {
    expect(() => assertTagSha(null, draft.target_commitish)).not.toThrow()
    expect(() => assertTagSha(draft.target_commitish, draft.target_commitish)).not.toThrow()
  })
  it("refuses to move an existing tag", () => {
    expect(() => assertTagSha("b".repeat(40), draft.target_commitish)).toThrow("Refusing to move")
  })
  it.each(["main", "abcdef", "", "z".repeat(40)])("requires an exact source SHA: %s", (sha) => {
    expect(() => assertTagSha(null, sha)).toThrow()
  })
  it.each(["https://github.com/able312/event_horizon.git", "git@github.com:able312/event_horizon.git", "ssh://git@github.com/able312/event_horizon", "https://github.com/able312/event_horizon"])("recognizes public remote %s", (remote) => {
    expect(githubRepository(remote)).toBe("able312/event_horizon")
  })
  it.each(["https://example.com/owner/repo", "https://github.com/owner/repo/extra", "https://github.com.evil.test/owner/repo", "/local/repo"])("rejects unsupported remote %s", (remote) => {
    expect(() => githubRepository(remote)).toThrow()
  })
})

describe("update metadata and files", () => {
  it("parses builder output and checks actual bytes", () => {
    expect(parseMetadata(yaml, version)).toEqual(metadata)
    expect(() => verifyFiles(metadata, files)).not.toThrow()
  })
  it("accepts quoted scalars, CRLF and optional blockMapSize", () => {
    expect(parseMetadata(yaml.replace(`version: ${version}`, `version: '${version}'`).replace("size: 123", "size: 123\n    blockMapSize: 10").replaceAll("\n", "\r\n"), version)).toEqual(metadata)
  })
  it.each([
    yaml.replace("version: 1.2.3", "version: 1.2.4"),
    yaml.replace(files[0].name, "../../something.zip"),
    yaml.replace(files[1].name, files[0].name),
    yaml.replace("size: 123", "size: 0"),
    yaml.replace("size: 123", "size: -1"),
    yaml.replace("size: 123", "size: nope"),
    yaml.replace("size: 123", "size: 1.5"),
    yaml.replace("size: 123", "size: 9007199254740992"),
    yaml.replace(`sha512: ${sha512}`, "sha512: bad"),
    yaml.replace(`path: ${files[0].name}`, `path: ${files[1].name}`),
    yaml.replace(`\nsha512: ${sha512}`, `\nsha512: ${Buffer.alloc(64, 2).toString("base64")}`),
    `${yaml}version: 1.2.3\n`,
    `${yaml}files:\n`,
    yaml.replace("size: 123", "size: 123\n    size: 123"),
    yaml.replace("files:", "files: &alias"),
    yaml.replace("files:", "files:\n  unknown: value"),
    yaml.replace(/ {2}- url:[\s\S]*?path:/, "path:"),
  ])("rejects malformed, unsafe or inconsistent metadata", (invalid) => {
    expect(() => parseMetadata(invalid, version)).toThrow(ArtifactValidationError)
  })
  it.each([
    [],
    [files[0]],
    [{ ...files[0], size: 124 }, files[1]],
    [{ ...files[0], sha512: "incorrect" }, files[1]],
  ].map((actual) => [actual] as const))("rejects missing files or mismatched hashes/sizes", (actual) => {
    expect(() => verifyFiles(metadata, actual)).toThrow(ArtifactValidationError)
  })
})

describe("uploaded asset verification", () => {
  it("accepts exactly five complete uploads", () => expect(() => verifyAssets(metadata, assets)).not.toThrow())
  it.each([
    assets.slice(1),
    [...assets, { name: "extra.txt", size: 1, state: "uploaded" }],
    assets.map((asset, i) => i === 0 ? { ...asset, size: 124 } : asset),
    assets.map((asset, i) => i === 1 ? { ...asset, size: 0 } : asset),
    assets.map((asset, i) => i === 1 ? { ...asset, state: "starter" } : asset),
    assets.map((asset, i) => i === 1 ? { ...asset, name: "Event.Horizon.zip.blockmap" } : asset),
    assets.map((asset, i) => i === 1 ? assets[0] : asset),
  ].map((invalid) => [invalid] as const))("rejects missing, extra, duplicate, misnamed, incomplete or wrong-sized uploads", (invalid) => {
    expect(() => verifyAssets(metadata, invalid)).toThrow(ArtifactValidationError)
  })
  it("also checks metadata and blockmap sizes against local files after upload", () => {
    const local = assets.map((asset) => ({ name: asset.name, size: asset.size, sha512 }))
    expect(() => verifyAssets(metadata, assets, local)).not.toThrow()
    local[1].size++
    expect(() => verifyAssets(metadata, assets, local)).toThrow(ArtifactValidationError)
    local[1].size--
    local[4].size++
    expect(() => verifyAssets(metadata, assets, local)).toThrow(ArtifactValidationError)
  })
})
