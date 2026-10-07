import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ArtifactValidationError, assertDraft, assertTagSha, assertUnchangedDraft, assertVersion, assertVersionOnlyBump, decideVersion, expectedAssetNames, githubRepository, parseMetadata, verifyAssets } from "./release-logic.ts"
import type { Bump, Release } from "./release-logic.ts"
import { inspectArtifacts, verifyPackages } from "./release-artifacts.ts"
import { npm, run } from "./release-commands.ts"

const root = fileURLToPath(new URL("..", import.meta.url))
process.chdir(root)
let ghEnv: NodeJS.ProcessEnv
let repository: string

function gh(args: string[]): string {
  return run("gh", args, { env: ghEnv, timeout: 10 * 60_000 })
}

function packageVersion(): string {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as { version: string; packages: Record<string, { version: string }> }
  assertVersion(pkg.version)
  if (lock.version !== pkg.version || lock.packages[""].version !== pkg.version) {
    throw new Error("package.json and package-lock.json versions disagree.")
  }
  return pkg.version
}

function findRelease(version: string): Release | null {
  try { return JSON.parse(gh(["api", `repos/${repository}/releases/tags/v${version}`])) as Release }
  catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 404")) return null
    throw error
  }
}

function tagSha(version: string): string | null {
  const tag = `refs/tags/v${version}`
  const refs = run("git", ["ls-remote", "public", tag, `${tag}^{}`]).split("\n").filter(Boolean)
  const peeled = refs.find((line) => line.endsWith(`${tag}^{}`)) ?? refs.find((line) => line.endsWith(tag))
  return peeled?.split(/\s+/)[0] ?? null
}

function preflight(build: boolean): void {
  if (build && (process.platform !== "darwin" || process.arch !== "arm64")) {
    throw new Error("Release builds require an Apple Silicon Mac with the signing identity installed.")
  }
  if (run("git", ["branch", "--show-current"]) !== "main") {
    throw new Error("Run this command from main. If a bump PR is waiting, merge it and pull main first.")
  }
  if (run("git", ["status", "--porcelain"])) throw new Error("The working tree must be clean, including untracked files.")
  repository = githubRepository(run("git", ["remote", "get-url", "public"]))
  if (githubRepository(run("git", ["remote", "get-url", "--push", "public"])) !== repository) {
    throw new Error("The public remote fetch and push URLs must point to the same repository.")
  }
  const config = JSON.parse(readFileSync("electron-builder.json", "utf8")) as { publish: { owner: string; repo: string } }
  if (`${config.publish.owner}/${config.publish.repo}` !== repository) throw new Error("public and the configured updater feed disagree.")
  run("git", ["fetch", "public", "main"])
  if (run("git", ["rev-parse", "HEAD"]) !== run("git", ["rev-parse", "FETCH_HEAD"])) {
    throw new Error("main must exactly match public/main. Pull with git pull --ff-only public main, then retry.")
  }
  // Capture the token in memory only; it is never printed or passed on the command line.
  ghEnv = { ...process.env, GH_TOKEN: run("gh", ["auth", "token", "--hostname", "github.com"]), GH_PROMPT_DISABLED: "1" }
  if (build && !run("security", ["find-identity", "-v", "-p", "codesigning"]).includes('"LNC Internal Signature"')) {
    throw new Error("The LNC Internal Signature code-signing identity is missing from the keychain.")
  }
}

function verifySource(release: Release, version: string): void {
  assertDraft(release, version)
  assertTagSha(tagSha(version), release.target_commitish)
  try { run("git", ["merge-base", "--is-ancestor", release.target_commitish, "HEAD"]) }
  catch { throw new Error(`Draft source ${release.target_commitish} is not reachable from main. Inspect the draft source before retrying.`) }
  const source = JSON.parse(run("git", ["show", `${release.target_commitish}:package.json`])) as { version: string }
  if (source.version !== version) throw new Error("Draft source commit does not contain the release version.")
}

async function verifyUploaded(release: Release, version: string): Promise<void> {
  assertDraft(release, version)
  verifyAssets({ version, files: [] }, release.assets)
  const directory = mkdtempSync(join(tmpdir(), "event-horizon-draft-"))
  try {
    gh(["release", "download", release.tag_name, "--repo", repository, "--pattern", "latest-mac.yml", "--dir", directory])
    const metadata = parseMetadata(readFileSync(join(directory, "latest-mac.yml"), "utf8"), version)
    verifyAssets(metadata, release.assets)
    console.log("Verifying uploaded draft hashes…")
    for (const name of expectedAssetNames(metadata).filter((name) => name !== "latest-mac.yml")) {
      gh(["release", "download", release.tag_name, "--repo", repository, "--pattern", name, "--dir", directory])
    }
    const inspected = await inspectArtifacts(directory, version)
    verifyAssets(inspected.metadata, release.assets, inspected.files)
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

function landBump(version: string): void {
  const branch = `release/v${version}`
  console.log(`\nLanding version ${version} through ${branch}…`)
  const remoteBranch = run("git", ["ls-remote", "--heads", "public", branch])
  const localBranch = run("git", ["branch", "--list", branch])
  if (remoteBranch || localBranch) {
    let branchSha: string
    if (remoteBranch) {
      run("git", ["fetch", "public", `refs/heads/${branch}`])
      branchSha = run("git", ["rev-parse", "FETCH_HEAD"])
    } else {
      branchSha = run("git", ["rev-parse", `refs/heads/${branch}`])
    }
    const pkg = JSON.parse(run("git", ["show", `${branchSha}:package.json`])) as { version: string }
    const changed = run("git", ["diff", "--name-only", `HEAD...${branchSha}`]).split("\n")
    if (pkg.version !== version || changed.some((name) => !["package.json", "package-lock.json"].includes(name))) {
      throw new Error(`Existing ${branch} is not a version-only bump; inspect it before retrying.`)
    }
    const base = run("git", ["merge-base", "HEAD", branchSha])
    assertVersionOnlyBump(
      run("git", ["show", `${base}:package.json`]), run("git", ["show", `${base}:package-lock.json`]),
      run("git", ["show", `${branchSha}:package.json`]), run("git", ["show", `${branchSha}:package-lock.json`]), version,
    )
    if (!remoteBranch) run("git", ["push", "public", `${branchSha}:refs/heads/${branch}`])
  } else {
    run("git", ["switch", "-c", branch])
    try {
      run("npm", ["version", version, "--no-git-tag-version", "--ignore-scripts"])
      run("git", ["add", "package.json", "package-lock.json"])
      run("git", ["commit", "-m", `chore: bump version to ${version}`])
      run("git", ["push", "public", `HEAD:refs/heads/${branch}`])
    } finally {
      if (!run("git", ["status", "--porcelain"])) run("git", ["switch", "main"])
    }
  }
  const prs = JSON.parse(gh(["pr", "list", "--repo", repository, "--head", branch, "--base", "main", "--state", "open", "--json", "url"])) as { url: string }[]
  const url = prs[0]?.url ?? gh(["pr", "create", "--repo", repository, "--head", branch, "--base", "main", "--title", `chore: bump version to ${version}`, "--body", `Update package.json and package-lock.json to ${version}. Release tests, lint and build run on the merged main commit before packaging.`])
  console.log(`Version PR: ${url}`)
  const head = JSON.parse(gh(["pr", "view", url, "--repo", repository, "--json", "headRefOid"])) as { headRefOid: string }
  try { gh(["pr", "merge", url, "--repo", repository, "--merge", "--match-head-commit", head.headRefOid]) }
  catch (error) {
    throw new Error(`The bump PR could not merge: ${url}. Resolve required reviews/checks, merge it, pull main and rerun npm run release. ${error instanceof Error ? error.message : String(error)}`)
  }
  const pr = JSON.parse(gh(["pr", "view", url, "--repo", repository, "--json", "state,mergeCommit"])) as { state: string; mergeCommit: { oid: string } | null }
  if (pr.state !== "MERGED" || !pr.mergeCommit) throw new Error(`PR is not merged. Complete ${url}, pull main and retry.`)
  run("git", ["pull", "--ff-only", "public", "main"])
  if (run("git", ["rev-parse", "HEAD"]) !== pr.mergeCommit.oid || packageVersion() !== version) {
    throw new Error("main advanced during the release bump. Rerun to build its current committed version.")
  }
}

function finish(release: Release): void {
  console.log(`\nDraft ready: ${release.html_url}\nInspect it, then run npm run release:publish.`)
  if (process.stdout.isTTY && process.env.CI !== "true") {
    try { run("open", [release.html_url]) }
    catch { console.log("Could not open a browser; use the draft URL above.") }
  }
}

async function buildRelease(bump: Bump): Promise<void> {
  const current = packageVersion()
  const existing = findRelease(current)
  if (existing?.draft) {
    verifySource(existing, current)
    try {
      await verifyUploaded(existing, current)
      const fresh = findRelease(current)
      assertUnchangedDraft(existing, fresh, current)
      finish(fresh)
      return
    } catch (error) {
      if (!(error instanceof ArtifactValidationError)) throw error
      console.log(`Draft needs repair: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const version = decideVersion(current, bump, existing)
  const next = version === current ? existing : findRelease(version)
  if (next && !next.draft) throw new Error(`v${version} is already published. Reconcile main's version before releasing.`)
  if (version !== current) landBump(version)
  const sha = run("git", ["rev-parse", "HEAD"])
  assertTagSha(tagSha(version), sha)
  npm("test", ["--maxWorkers=2"])
  npm("lint")
  npm("typecheck:release")
  npm("build")
  const directory = resolve("dist", `release-v${version}`)
  rmSync(directory, { recursive: true, force: true })
  npm("dist:mac", [`-c.directories.output=${directory}`])
  console.log("\nVerifying package metadata, signatures and isolated launch…")
  const inspected = await inspectArtifacts(directory, version)
  await verifyPackages(directory, inspected.metadata)
  if (run("git", ["status", "--porcelain"]) || run("git", ["rev-parse", "HEAD"]) !== sha) {
    throw new Error("Source changed during the build. Rerun from clean main.")
  }
  assertTagSha(tagSha(version), sha)
  const previous = findRelease(version)
  if (next) assertUnchangedDraft(next, previous, version)
  else if (previous) throw new Error("A release appeared during the build. Rerun to inspect it.")
  if (previous) {
    assertDraft(previous, version)
    // Delete the checked release ID, never a tag or a published release.
    gh(["api", "--method", "DELETE", `repos/${repository}/releases/${previous.id}`])
  }
  console.log(`\nUploading verified artifacts to draft v${version}…`)
  gh(["release", "create", `v${version}`, "--repo", repository, "--draft", "--target", sha, "--title", version, "--generate-notes"])
  const draft = findRelease(version)
  assertDraft(draft, version)
  if (draft.target_commitish !== sha) throw new Error("Created draft targets the wrong source commit.")
  gh(["release", "upload", `v${version}`, "--repo", repository, ...expectedAssetNames(inspected.metadata).map((name) => join(directory, name))])
  const uploaded = findRelease(version)
  assertDraft(uploaded, version)
  verifySource(uploaded, version)
  verifyAssets(inspected.metadata, uploaded.assets, inspected.files)
  finish(uploaded)
}

async function publishRelease(): Promise<void> {
  const version = packageVersion()
  const draft = findRelease(version)
  assertDraft(draft, version)
  verifySource(draft, version)
  await verifyUploaded(draft, version)
  const fresh = findRelease(version)
  assertUnchangedDraft(draft, fresh, version)
  verifySource(fresh, version)
  console.log(`\nPublishing ${draft.tag_name}…`)
  gh(["release", "edit", draft.tag_name, "--repo", repository, "--draft=false", "--latest"])
  const published = findRelease(version)
  if (!published || published.draft || tagSha(version) !== draft.target_commitish) {
    throw new Error("Publication could not be confirmed. Inspect the GitHub release before retrying.")
  }
  console.log(`\nPublished: ${published.html_url}`)
}

export async function runRelease(args = process.argv.slice(2), publish = false): Promise<void> {
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: npm run release -- [patch|minor|major] (default: patch), or npm run release:publish. Run from clean, current main.")
    return
  }
  const [bump = "patch", ...extra] = args
  if (extra.length || !["patch", "minor", "major"].includes(bump) || (publish && args.length)) {
    throw new Error("Usage: npm run release -- [patch|minor|major], or npm run release:publish.")
  }
  preflight(!publish)
  const lock = resolve(run("git", ["rev-parse", "--git-common-dir"]), "event-horizon-release.lock")
  try { mkdirSync(lock) }
  catch { throw new Error(`Another release command is running. If a previous process was killed, remove ${lock} and retry.`) }
  try {
    if (publish) await publishRelease()
    else await buildRelease(bump as Bump)
  } finally { rmSync(lock, { recursive: true, force: true }) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRelease().catch((error: unknown) => {
    console.error(`\nRelease stopped: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
