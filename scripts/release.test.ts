// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ArtifactValidationError, expectedAssetNames } from "./release-logic.ts"
import type { Release } from "./release-logic.ts"
import { run, npm } from "./release-commands.ts"
import { inspectArtifacts, verifyPackages } from "./release-artifacts.ts"
import { runRelease } from "./release.ts"
import { mkdirSync, rmSync } from "node:fs"

vi.mock("./release-commands.ts", () => ({ run: vi.fn(), npm: vi.fn() }))
vi.mock("./release-artifacts.ts", () => ({ inspectArtifacts: vi.fn(), verifyPackages: vi.fn() }))
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  return {
    ...actual,
    readFileSync: (path: string, encoding: BufferEncoding) => {
      if (path === "package.json") return JSON.stringify({ version: localVersion })
      if (path === "package-lock.json") return JSON.stringify({ version: localVersion, packages: { "": { version: localVersion } } })
      if (path.endsWith("latest-mac.yml")) return yaml.replaceAll(version, localVersion)
      return actual.readFileSync(path, encoding)
    },
  }
})

const sha = "a".repeat(40)
const hash = Buffer.alloc(64, 1).toString("base64")
const version = "0.1.3"
const metadata = { version, files: [
  { name: `Event-Horizon-${version}-arm64.zip`, size: 123, sha512: hash },
  { name: `Event-Horizon-${version}-arm64.dmg`, size: 456, sha512: hash },
] }
const yaml = `version: ${version}
files:
  - url: ${metadata.files[0].name}
    sha512: ${hash}
    size: 123
  - url: ${metadata.files[1].name}
    sha512: ${hash}
    size: 456
path: ${metadata.files[0].name}
sha512: ${hash}
releaseDate: '2026-10-07T12:00:00Z'
`
const assets = expectedAssetNames(metadata).map((name) => ({ name, size: metadata.files.find((file) => file.name === name)?.size ?? 10, state: "uploaded" }))
const draft: Release = { id: 1, tag_name: `v${version}`, draft: true, prerelease: false, target_commitish: sha, html_url: "https://github.com/able312/event_horizon/releases/1", assets }

let current: Release | null
let tag: string | null
let branch: string
let dirty: boolean
let downloadsFail: boolean
let localVersion: string
let pendingVersion: string
let headSha: string
let mergeBlocked: boolean
let mergeStateStatus: string
let mergeQueue: boolean
let nextDraft: typeof draft | null
let versionFails: boolean

function artifactsFor(targetVersion: string) {
  const info = { version: targetVersion, files: metadata.files.map((file) => ({ ...file, name: file.name.replace(version, targetVersion) })) }
  const uploaded = assets.map((asset) => ({ ...asset, name: asset.name.replace(version, targetVersion) }))
  return { metadata: info, files: uploaded.map((asset) => ({ ...asset, sha512: hash })) }
}

beforeEach(() => {
  mkdirSync("node_modules/.release-test-git", { recursive: true })
  for (const mock of [run, npm, inspectArtifacts, verifyPackages]) vi.mocked(mock).mockReset()
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin")
  vi.spyOn(process, "arch", "get").mockReturnValue("arm64")
  current = structuredClone(draft)
  tag = null
  branch = "main"
  dirty = false
  downloadsFail = false
  localVersion = version
  pendingVersion = version
  headSha = sha
  mergeBlocked = false
  mergeStateStatus = "CLEAN"
  mergeQueue = false
  nextDraft = null
  versionFails = false
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.mocked(inspectArtifacts).mockImplementation(async (_directory, targetVersion) => artifactsFor(targetVersion))
  vi.mocked(verifyPackages).mockResolvedValue()
  vi.mocked(run).mockImplementation((command, args) => {
    if (command === "security") return '1) HASH "LNC Internal Signature"'
    if (command === "git") {
      if (args[0] === "branch") return args[1] === "--list" ? "" : branch
      if (args[0] === "status") return dirty ? " M package.json" : ""
      if (args[0] === "reset") { dirty = false; return "" }
      if (args[0] === "remote") return "https://github.com/able312/event_horizon.git"
      if (args[0] === "rev-parse" && args[1] === "--git-common-dir") return "node_modules/.release-test-git"
      if (args[0] === "rev-parse") return headSha
      if (args[0] === "ls-remote") return tag && args.includes(`refs/tags/v${version}`) ? `${tag}\trefs/tags/v${version}` : ""
      if (args[0] === "show") return JSON.stringify({ version: localVersion })
      if (args[0] === "switch") { branch = args[args.length - 1]; if (branch === "main") localVersion = version; return "" }
      if (args[0] === "pull") { localVersion = pendingVersion; headSha = "c".repeat(40); return "" }
      if (["add", "commit", "push"].includes(args[0])) return ""
      if (args[0] === "merge-base" && args.includes("d".repeat(40))) throw new Error("not an ancestor")
      if (["fetch", "merge-base"].includes(args[0])) return ""
    }
    if (command === "gh") {
      if (args[0] === "auth") return "test-token"
      if (args[0] === "api" && args[1] === "--method" && args[2] === "DELETE") { current = null; return "" }
      // Like GitHub, drafts are only visible by listing releases, never through releases/tags.
      if (args[0] === "api" && args.includes("--slurp") && args.at(-1) === "repos/able312/event_horizon/releases?per_page=100") {
        return JSON.stringify([[...(current ? [current] : []), ...(nextDraft ? [nextDraft] : [])]])
      }
      if (args[0] === "release" && args[1] === "download") {
        if (downloadsFail) throw new Error("network unavailable")
        return ""
      }
      if (args[0] === "release" && args[1] === "create") { current = { ...draft, tag_name: args[2], target_commitish: headSha, assets: [] }; return "" }
      if (args[0] === "release" && args[1] === "upload") { current = { ...draft, tag_name: args[2], target_commitish: headSha, assets: artifactsFor(localVersion).files.map((file) => ({ name: file.name, size: file.size, state: "uploaded" })) }; return "" }
      if (args[0] === "release" && args[1] === "edit") { current = { ...draft, draft: false }; tag = sha; return "" }
      if (args[0] === "api" && args[1] === "graphql") return JSON.stringify({ data: { repository: { mergeQueue: mergeQueue ? { id: "q" } : null } } })
      if (args[0] === "pr" && args[1] === "list") return "[]"
      if (args[0] === "pr" && args[1] === "create") return "https://github.com/able312/event_horizon/pull/99"
      if (args[0] === "pr" && args[1] === "view") return args.includes("headRefOid,mergeStateStatus") ? JSON.stringify({ headRefOid: "b".repeat(40), mergeStateStatus }) : JSON.stringify({ state: "MERGED", mergeCommit: { oid: "c".repeat(40) } })
      if (args[0] === "pr" && args[1] === "merge") {
        if (mergeBlocked) throw new Error("required reviews")
        return ""
      }
    }
    if (command === "npm" && args[0] === "version") {
      localVersion = pendingVersion = args[1]
      if (versionFails) { dirty = true; throw new Error("npm version failed") }
      return ""
    }
    if (command === "open") return ""
    throw new Error(`Unexpected command in test: ${command} ${args.join(" ")}`)
  })
})

afterEach(() => {
  rmSync("node_modules/.release-test-git", { recursive: true, force: true })
  vi.restoreAllMocks()
})

const ghWrites = () => vi.mocked(run).mock.calls.filter(([command, args]) => command === "gh" &&
  (args.includes("DELETE") || ["create", "upload", "edit"].includes(args[1])))

describe("release orchestration", () => {
  it("lands a bump PR, then builds and targets its merged main commit", async () => {
    current = { ...draft, draft: false }
    tag = sha
    await runRelease([])
    const calls = vi.mocked(run).mock.calls
    expect(calls).toContainEqual(["npm", ["version", "0.1.4", "--no-git-tag-version", "--ignore-scripts"]])
    expect(calls.some(([command, args]) => command === "gh" && args[0] === "pr" && args[1] === "merge" && args.includes("--match-head-commit"))).toBe(true)
    const create = ghWrites().find(([, args]) => args[1] === "create" && args[0] === "release")!
    expect(create[1]).toContain("v0.1.4")
    expect(create[1]).toContain("c".repeat(40))
    expect(localVersion).toBe("0.1.4")
    expect(branch).toBe("main")
  })
  it("does not merge a bump PR that would only be queued or auto-merged", async () => {
    current = { ...draft, draft: false }
    mergeStateStatus = "BLOCKED"
    await expect(runRelease([])).rejects.toThrow("not ready to merge immediately")
    expect(ghWrites().some(([, args]) => args[0] === "pr" && args[1] === "merge")).toBe(false)
    expect(npm).not.toHaveBeenCalled()
  })
  it("does not merge a bump PR when main uses a merge queue", async () => {
    current = { ...draft, draft: false }
    mergeQueue = true
    await expect(runRelease([])).rejects.toThrow("merge queue")
    expect(ghWrites().some(([, args]) => args[0] === "pr" && args[1] === "merge")).toBe(false)
    expect(npm).not.toHaveBeenCalled()
  })
  it("refuses to replace a next-version draft that targets an unrelated commit", async () => {
    current = { ...draft, draft: false }
    tag = sha
    nextDraft = { ...draft, tag_name: "v0.1.4", target_commitish: "d".repeat(40) }
    await expect(runRelease([])).rejects.toThrow()
    expect(ghWrites().some(([, args]) => args.includes("DELETE"))).toBe(false)
    expect(npm).not.toHaveBeenCalled()
  })
  it("stops at a protected bump PR before building or creating a draft", async () => {
    current = { ...draft, draft: false }
    mergeBlocked = true
    await expect(runRelease([])).rejects.toThrow("Resolve required reviews/checks")
    expect(npm).not.toHaveBeenCalled()
    expect(ghWrites().some(([, args]) => args[0] === "release")).toBe(false)
    expect(branch).toBe("main")
  })
  it("reuses a complete draft without builds or GitHub writes", async () => {
    await runRelease([])
    expect(npm).not.toHaveBeenCalled()
    expect(verifyPackages).toHaveBeenCalledOnce()
    expect(ghWrites()).toEqual([])
    expect(inspectArtifacts).toHaveBeenCalledOnce()
  })
  it("repairs a reused draft whose downloaded packages fail verification", async () => {
    vi.mocked(verifyPackages).mockRejectedValueOnce(new ArtifactValidationError("unsigned"))
    await runRelease([])
    expect(verifyPackages).toHaveBeenCalledTimes(2)
    expect(npm).toHaveBeenCalled()
  })
  it("repairs a partial draft at the same version after all gates pass", async () => {
    current = { ...draft, assets: assets.slice(1) }
    await runRelease([])
    expect(vi.mocked(npm).mock.calls.map(([script]) => script)).toEqual(["test", "lint", "typecheck:release", "dist:mac"])
    expect(verifyPackages).toHaveBeenCalledOnce()
    const writes = ghWrites()
    expect(writes.map(([, args]) => args[1])).toEqual(["--method", "create", "upload"])
    expect(writes[1][1]).toContain(`v${version}`)
    expect(writes[1][1]).toContain("--draft")
    expect(writes[1][1]).toContain(sha)
  })
  it("repairs a draft whose target was changed to a branch name", async () => {
    current = { ...draft, target_commitish: "main" }
    await runRelease([])
    expect(verifyPackages).toHaveBeenCalledOnce()
    expect(ghWrites().map(([, args]) => args[1])).toEqual(["--method", "create", "upload"])
  })
  it("gives asset uploads a longer timeout than other GitHub calls", async () => {
    current = { ...draft, assets: [] }
    await runRelease([])
    const upload = vi.mocked(run).mock.calls.find(([command, args]) => command === "gh" && args[1] === "upload")!
    expect(upload[2]?.timeout).toBeGreaterThan(10 * 60_000)
  })
  it("returns to a clean main without a leftover branch when the bump fails", async () => {
    current = { ...draft, draft: false }
    versionFails = true
    await expect(runRelease([])).rejects.toThrow("npm version failed")
    const git = vi.mocked(run).mock.calls.filter(([command]) => command === "git").map(([, args]) => args)
    expect(git).toContainEqual(["branch", "-D", "release/v0.1.4"])
    expect(branch).toBe("main")
    expect(dirty).toBe(false)
    expect(ghWrites()).toEqual([])
  })
  it("builds an unreleased merged version without another bump", async () => {
    current = null
    await runRelease(["minor"])
    expect(npm).toHaveBeenCalled()
    expect(ghWrites().map(([, args]) => args[1])).toEqual(["create", "upload"])
  })
  it("preserves an incomplete draft when a quality gate fails", async () => {
    current = { ...draft, assets: [] }
    vi.mocked(npm).mockImplementationOnce(() => { throw new Error("tests failed") })
    await expect(runRelease([])).rejects.toThrow("tests failed")
    expect(ghWrites()).toEqual([])
  })
  it("preserves an incomplete draft when package verification fails", async () => {
    current = { ...draft, assets: [] }
    vi.mocked(verifyPackages).mockRejectedValueOnce(new Error("signature failed"))
    await expect(runRelease([])).rejects.toThrow("signature failed")
    expect(ghWrites()).toEqual([])
  })
  it("does not rebuild or delete a draft after a network failure", async () => {
    downloadsFail = true
    await expect(runRelease([])).rejects.toThrow("network unavailable")
    expect(npm).not.toHaveBeenCalled()
    expect(ghWrites()).toEqual([])
  })
  it("stops on a mismatched tag before building or publishing", async () => {
    tag = "b".repeat(40)
    await expect(runRelease([])).rejects.toThrow("Refusing to move")
    await expect(runRelease([], true)).rejects.toThrow("Refusing to move")
    expect(npm).not.toHaveBeenCalled()
    expect(ghWrites()).toEqual([])
  })
  it("publishes the verified uploaded draft without rebuilding", async () => {
    await runRelease([], true)
    expect(npm).not.toHaveBeenCalled()
    expect(inspectArtifacts).toHaveBeenCalledOnce()
    expect(verifyPackages).toHaveBeenCalledOnce()
    expect(ghWrites()).toHaveLength(1)
    expect(ghWrites()[0][1]).toEqual(["release", "edit", `v${version}`, "--repo", "able312/event_horizon", "--draft=false", "--latest"])
  })
  it("refuses to publish incomplete or hash-mismatched artifacts", async () => {
    current = { ...draft, assets: [] }
    await expect(runRelease([], true)).rejects.toThrow(ArtifactValidationError)
    current = structuredClone(draft)
    vi.mocked(inspectArtifacts).mockRejectedValueOnce(new ArtifactValidationError("hash mismatch"))
    await expect(runRelease([], true)).rejects.toThrow("hash mismatch")
    expect(ghWrites()).toEqual([])
    current = structuredClone(draft)
    vi.mocked(verifyPackages).mockRejectedValueOnce(new ArtifactValidationError("unsigned"))
    await expect(runRelease([], true)).rejects.toThrow("unsigned")
    expect(ghWrites()).toEqual([])
  })
  it.each([null, { ...draft, draft: false }])("refuses publication without a current draft", async (release) => {
    current = release
    await expect(runRelease([], true)).rejects.toThrow()
    expect(ghWrites()).toEqual([])
  })
  it("refuses dirty or non-main checkouts before contacting GitHub", async () => {
    branch = "feature"
    await expect(runRelease([])).rejects.toThrow("from main")
    branch = "main"
    dirty = true
    await expect(runRelease([])).rejects.toThrow("must be clean")
    expect(ghWrites()).toEqual([])
  })
  it("rejects invalid arguments before preflight", async () => {
    await expect(runRelease(["invalid"])).rejects.toThrow("Usage")
    await expect(runRelease(["patch", "extra"])).rejects.toThrow("Usage")
    expect(run).not.toHaveBeenCalled()
  })
})
