import { isDeepStrictEqual } from "node:util"

export type Bump = "patch" | "minor" | "major"
export type Release = {
  id: number
  tag_name: string
  draft: boolean
  prerelease: boolean
  target_commitish: string
  html_url: string
  assets: Asset[]
}
export type Asset = { name: string; size: number; state: string; id?: number; digest?: string | null; updated_at?: string }
export type FileInfo = { name: string; size: number; sha512: string }
export type Metadata = { version: string; files: FileInfo[] }
export class ArtifactValidationError extends Error {}

export function assertVersion(version: string): void {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
      version.split(".").some((part) => !Number.isSafeInteger(Number(part)))) {
    throw new Error(`Expected a stable X.Y.Z version, got ${version}.`)
  }
}

export function decideVersion(current: string, bump: Bump, release: Release | null): string {
  assertVersion(current)
  if (release && release.tag_name !== `v${current}`) throw new Error("Release tag does not match the current version.")
  if (!release || release.draft) return current
  const parts = current.split(".").map(Number)
  const index = { major: 0, minor: 1, patch: 2 }[bump]
  parts[index]++
  for (let i = index + 1; i < 3; i++) parts[i] = 0
  const next = parts.join(".")
  assertVersion(next)
  return next
}

export function assertDraft(release: Release | null, version: string): asserts release is Release {
  if (!release) throw new Error(`No draft exists for v${version}. Run npm run release first.`)
  if (!release.draft) throw new Error(`v${version} is already published; refusing to change it.`)
  if (release.prerelease || release.tag_name !== `v${version}`) {
    throw new Error("Expected a normal draft with the current version tag.")
  }
}

export function assertTagSha(tagSha: string | null, buildSha: string): void {
  // Repairable: a draft edited in the GitHub UI can target a branch name instead of a SHA.
  if (!/^[a-f0-9]{40}$/.test(buildSha)) throw new ArtifactValidationError("Draft target must be a full source commit SHA.")
  if (tagSha !== null && tagSha !== buildSha) {
    throw new Error(`Existing tag points to ${tagSha}, but the build commit is ${buildSha}. Refusing to move the tag.`)
  }
}

// GitHub's releases/tags endpoint omits drafts, so releases are found by listing them.
export function selectRelease(pages: Release[][], version: string): Release | null {
  const matches = pages.flat().filter((release) => release.tag_name === `v${version}`)
  if (matches.length > 1) {
    throw new Error(`Found ${matches.length} releases for v${version}. Delete the extra drafts on GitHub, then retry.`)
  }
  return matches[0] ?? null
}

export function assertUnchangedDraft(before: Release, after: Release | null, version: string): asserts after is Release {
  assertDraft(after, version)
  const snapshot = (release: Release) => release.assets.map(({ id, name, size, state, digest, updated_at }) =>
    ({ id, name, size, state, digest, updated_at })).sort((a, b) => a.name.localeCompare(b.name))
  // Download counts change during verification; compare only artifact identity/content.
  if (after.id !== before.id || after.target_commitish !== before.target_commitish ||
      JSON.stringify(snapshot(after)) !== JSON.stringify(snapshot(before))) {
    throw new Error("The draft changed during verification. Retry to inspect its current contents.")
  }
}

export function githubRepository(remote: string): string {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(remote)
  if (!match) throw new Error("The public remote must point to a GitHub repository.")
  return match[1]
}

export function assertVersionOnlyBump(basePackage: string, baseLock: string, nextPackage: string, nextLock: string, version: string): void {
  const pkg = JSON.parse(nextPackage) as { version: string }
  const lock = JSON.parse(nextLock) as { version: string; packages: Record<string, { version: string }> }
  if (pkg.version !== version || lock.version !== version || lock.packages[""].version !== version) {
    throw new Error("Existing release branch package and lockfile must have the intended version.")
  }
  const basePkg = JSON.parse(basePackage) as { version: string }
  const baseLockfile = JSON.parse(baseLock) as { version: string; packages: Record<string, { version: string }> }
  pkg.version = basePkg.version
  lock.version = baseLockfile.version
  lock.packages[""].version = baseLockfile.packages[""].version
  if (!isDeepStrictEqual(pkg, basePkg) || !isDeepStrictEqual(lock, baseLockfile)) {
    throw new Error("Existing release branch contains changes beyond the package and lockfile versions.")
  }
}

// Deliberately accepts only electron-builder's small update-info schema. Unsupported
// YAML is rejected instead of introducing a general-purpose parser dependency.
export function parseMetadata(yaml: string, version: string): Metadata {
  assertVersion(version)
  const values = new Map<string, string>()
  const files: Record<string, string>[] = []
  let inFiles = false
  let seenFiles = false
  for (const raw of yaml.trim().split(/\r?\n/)) {
    if (!raw.trim()) continue
    if (raw === "files:") {
      if (seenFiles) throw new ArtifactValidationError("Duplicate files metadata.")
      seenFiles = true
      inFiles = true
      continue
    }
    const item = /^ {2}- url: (.+)$/.exec(raw)
    if (item && inFiles) { files.push({ url: scalar(item[1]) }); continue }
    const field = /^ {4}(sha512|size|blockMapSize): (.+)$/.exec(raw)
    if (field && inFiles && files.length) {
      const file = files[files.length - 1]
      if (field[1] in file) throw new ArtifactValidationError("Duplicate file metadata.")
      file[field[1]] = scalar(field[2])
      continue
    }
    const top = /^(version|path|sha512|releaseDate): (.+)$/.exec(raw)
    if (!top || values.has(top[1])) throw new ArtifactValidationError(`Unsupported update metadata: ${raw}`)
    inFiles = false
    values.set(top[1], scalar(top[2]))
  }
  if (values.get("version") !== version) throw new ArtifactValidationError("Update metadata version does not match package.json.")
  const expected = [`Event-Horizon-${version}-arm64.zip`, `Event-Horizon-${version}-arm64.dmg`]
  const parsed = files.map((file) => ({ name: file.url, size: Number(file.size), sha512: file.sha512 }))
  if (parsed.length !== 2 || new Set(parsed.map((file) => file.name)).size !== 2 ||
      parsed.some((file) => !expected.includes(file.name) || !Number.isSafeInteger(file.size) || file.size <= 0 ||
        !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512 ?? ""))) {
    throw new ArtifactValidationError("Metadata must describe exactly the expected arm64 DMG and ZIP, with sizes and SHA-512 hashes.")
  }
  const zip = parsed.find((file) => file.name.endsWith(".zip"))!
  if (values.get("path") !== zip.name || values.get("sha512") !== zip.sha512) {
    throw new ArtifactValidationError("Legacy ZIP metadata disagrees with the files list.")
  }
  return { version, files: parsed }
}

function scalar(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, "$2")
}

export function verifyFiles(metadata: Metadata, actual: FileInfo[]): void {
  for (const expected of metadata.files) {
    const file = actual.find((item) => item.name === expected.name)
    if (!file || file.size !== expected.size || file.sha512 !== expected.sha512) {
      throw new ArtifactValidationError(`Size or SHA-512 mismatch for ${expected.name}.`)
    }
  }
}

export function expectedAssetNames(metadata: Metadata): string[] {
  return ["zip", "dmg"].flatMap((ext) => {
    const name = `Event-Horizon-${metadata.version}-arm64.${ext}`
    return [name, `${name}.blockmap`]
  }).concat("latest-mac.yml")
}

export function verifyAssets(metadata: Metadata, assets: Asset[], local?: FileInfo[]): void {
  const names = expectedAssetNames(metadata)
  if (assets.length !== names.length || new Set(assets.map((asset) => asset.name)).size !== names.length) {
    throw new ArtifactValidationError("Draft must contain exactly the DMG, ZIP, both blockmaps and latest-mac.yml.")
  }
  for (const name of names) {
    const asset = assets.find((item) => item.name === name)
    const size = local?.find((file) => file.name === name)?.size ?? metadata.files.find((file) => file.name === name)?.size
    if (!asset || asset.state !== "uploaded" || asset.size <= 0 || (size !== undefined && asset.size !== size)) {
      throw new ArtifactValidationError(`Missing, incomplete or wrong-sized uploaded asset: ${name}.`)
    }
  }
}
