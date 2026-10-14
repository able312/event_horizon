import { createHash } from "node:crypto"
import { closeSync, createReadStream, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, realpathSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { extractFile, statFile } from "@electron/asar"
import { ArtifactValidationError, expectedAssetNames, parseMetadata, platforms, verifyFiles } from "./release-logic.ts"
import type { FileInfo, Metadata, Platform } from "./release-logic.ts"
import { run } from "./release-commands.ts"

export type ReleaseMetadata = Record<Platform, Metadata>

export async function inspectArtifacts(directory: string, version: string): Promise<{ metadata: ReleaseMetadata; files: FileInfo[] }> {
  const read = (platform: Platform) => parseMetadata(readFileSync(join(directory, platforms[platform].metadataFile), "utf8"), version, platform)
  const metadata = { mac: read("mac"), win: read("win") }
  const files: FileInfo[] = []
  for (const name of expectedAssetNames(version)) {
    const path = join(directory, name)
    const info = statSync(path)
    if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty artifact: ${name}.`)
    const hash = createHash("sha512")
    for await (const chunk of createReadStream(path)) hash.update(chunk)
    files.push({ name, size: info.size, sha512: hash.digest("base64") })
  }
  verifyFiles(metadata.mac, files)
  verifyFiles(metadata.win, files)
  return { metadata, files }
}

// SHA-256 of the leaf signing certificate recorded in docs/MACOS_SIGNING.md; a matching display name is not enough.
const signingCertificateSha256 = "CE28BFB44F06DA80059275F67E67B9AC8A326B567F5E89965573EEBBF748F4D7"

// Deterministic package defects are repairable by rebuilding; extraction and mounting failures stay plain errors.
function verifySignature(appPath: string, version: string): void {
  try { checkSignature(appPath, version) }
  catch (error) { throw new ArtifactValidationError(error instanceof Error ? error.message : String(error)) }
}

function checkSignature(appPath: string, version: string): void {
  run("codesign", ["--verify", "--deep", "--strict", appPath])
  // codesign writes its display output to stderr even on success.
  const details = run("codesign", ["--display", "--verbose=4", appPath], { captureStderr: true })
  if (!details.includes("Authority=LNC Internal Signature\n") || !/flags=.*\bruntime\b/.test(details) ||
      !details.includes("Identifier=com.latenightcreation.event-horizon\n")) {
    throw new Error("Package must have the expected signing authority, app identifier and hardened runtime.")
  }
  const certificates = mkdtempSync(join(tmpdir(), "event-horizon-cert-"))
  try {
    // codesign writes the signing chain as <prefix>0 (leaf), <prefix>1, … DER files.
    run("codesign", ["--display", `--extract-certificates=${join(certificates, "cert")}`, appPath], { captureStderr: true })
    const leaf = createHash("sha256").update(readFileSync(join(certificates, "cert0"))).digest("hex").toUpperCase()
    if (leaf !== signingCertificateSha256) throw new Error("Package is not signed by the pinned LNC Internal Signature certificate.")
  } finally { rmSync(certificates, { recursive: true, force: true }) }
  const plist = join(appPath, "Contents/Info.plist")
  if (run("plutil", ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", plist]) !== version ||
      run("lipo", ["-archs", join(appPath, "Contents/MacOS/Event Horizon")]) !== "arm64") {
    throw new Error("Packaged app version or architecture is wrong.")
  }
}

async function smokeLaunch(appPath: string, root: string): Promise<void> {
  const userData = join(root, "user-data")
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production" }
  delete env.ELECTRON_RUN_AS_NODE
  const child = spawn(join(appPath, "Contents/MacOS/Event Horizon"), [
    `--user-data-dir=${userData}`,
    "--host-resolver-rules=MAP * 0.0.0.0",
  ], { env, stdio: ["ignore", "pipe", "pipe"] })
  let output = ""
  let failure: Error | undefined
  child.on("error", (error) => { failure = error })
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (data: Buffer) => { output = (output + data.toString()).slice(-100_000) })
  }
  const closed = new Promise<void>((resolve) => child.once("close", () => resolve()))
  const started = Date.now()
  try {
    // Stay up for at least 10 seconds; allow a slow first launch (e.g. Gatekeeper scanning) up to 60.
    for (;;) {
      const running = !failure && child.exitCode === null && child.signalCode === null
      const loaded = output.includes("Renderer loaded:")
      const elapsed = Date.now() - started
      if (running && loaded && elapsed >= 10_000) break
      if (!running || elapsed >= 60_000) throw new ArtifactValidationError(`Isolated app launch failed: ${failure?.message ?? output}`)
      await delay(500)
    }
  } finally {
    child.kill("SIGTERM")
    await Promise.race([closed, delay(5_000)])
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL")
      await closed
    }
  }
}

// Best effort, so a busy volume never hides the verification result.
function detach(mount: string): boolean {
  for (const args of [["detach", mount], ["detach", "-force", mount]]) {
    try { run("hdiutil", args); return true }
    catch { /* retry with -force, then report */ }
  }
  return false
}

// A hash-consistent archive that cannot be extracted or mounted is a corrupt package, which a rebuild repairs.
function unpackable(action: () => void): void {
  try { action() }
  catch (error) { throw new ArtifactValidationError(error instanceof Error ? error.message : String(error)) }
}

/** Returns the PE machine type, or null if the file is not a Windows executable. */
function peMachine(path: string): number | null {
  const header = Buffer.alloc(4096)
  const fd = openSync(path, "r")
  try { readSync(fd, header, 0, header.length, 0) }
  finally { closeSync(fd) }
  if (header.toString("latin1", 0, 2) !== "MZ") return null
  const offset = header.readUInt32LE(0x3c)
  if (offset + 6 > header.length || header.toString("latin1", offset, offset + 4) !== "PE\0\0") return null
  return header.readUInt16LE(offset + 4)
}

const AMD64 = 0x8664

/**
 * The Windows app can't be launched on a Mac, so check what electron-builder packed into the
 * installer: an x64 executable, this version's app code, and an update feed pointing at our releases.
 */
export function verifyWindowsBuild(directory: string, version: string): void {
  try { checkWindowsBuild(join(directory, "win-unpacked"), version) }
  catch (error) { throw new ArtifactValidationError(`Windows build check failed: ${error instanceof Error ? error.message : String(error)}`) }
}

function checkWindowsBuild(appDirectory: string, version: string): void {
  if (peMachine(join(appDirectory, "Event Horizon.exe")) !== AMD64) throw new Error("Event Horizon.exe is not an x64 Windows executable.")
  const archive = join(appDirectory, "resources/app.asar")
  const pkg = JSON.parse(extractFile(archive, "package.json").toString("utf8")) as { version?: string; main?: string }
  if (pkg.version !== version || !pkg.main) throw new Error("Packaged package.json has the wrong version or no main entry.")
  // statFile throws for paths missing from the archive.
  for (const file of [pkg.main, "dist-react/index.html"]) statFile(archive, file)
  const { publish } = JSON.parse(readFileSync("electron-builder.json", "utf8")) as { publish: { owner: string; repo: string } }
  const feed = readFileSync(join(appDirectory, "resources/app-update.yml"), "utf8").split(/\r?\n/)
  if (!["provider: github", `owner: ${publish.owner}`, `repo: ${publish.repo}`].every((line) => feed.includes(line))) {
    throw new Error("app-update.yml does not point at the configured GitHub releases.")
  }
}

function verifyWindowsInstaller(directory: string, metadata: Metadata): void {
  for (const file of metadata.files) {
    if (peMachine(join(directory, file.name)) === null) throw new ArtifactValidationError(`${file.name} is not a Windows executable.`)
  }
}

export async function verifyPackages(directory: string, metadata: ReleaseMetadata): Promise<void> {
  verifyWindowsInstaller(directory, metadata.win)
  const root = realpathSync(mkdtempSync(join(tmpdir(), "event-horizon-smoke-")))
  let stillMounted = false
  try {
    const zip = metadata.mac.files.find((file) => file.name.endsWith(".zip"))!
    unpackable(() => run("ditto", ["-x", "-k", join(directory, zip.name), join(root, "zip")]))
    const appPath = join(root, "zip/Event Horizon.app")
    verifySignature(appPath, metadata.mac.version)
    const dmg = metadata.mac.files.find((file) => file.name.endsWith(".dmg"))!
    const mount = join(root, "dmg")
    mkdirSync(mount)
    unpackable(() => run("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mount, join(directory, dmg.name)]))
    try { verifySignature(join(mount, "Event Horizon.app"), metadata.mac.version) }
    finally { stillMounted = !detach(mount) }
    await smokeLaunch(appPath, root)
  } finally {
    // Never delete through a mounted volume; leave the directory for manual cleanup instead.
    if (stillMounted) console.warn(`Could not detach ${join(root, "dmg")}. Eject it, then delete ${root}.`)
    else rmSync(root, { recursive: true, force: true })
  }
}
