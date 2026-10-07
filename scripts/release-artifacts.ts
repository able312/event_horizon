import { createHash } from "node:crypto"
import { createReadStream, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { expectedAssetNames, parseMetadata, verifyFiles } from "./release-logic.ts"
import type { FileInfo, Metadata } from "./release-logic.ts"
import { run } from "./release-commands.ts"

export async function inspectArtifacts(directory: string, version: string): Promise<{ metadata: Metadata; files: FileInfo[] }> {
  const metadata = parseMetadata(readFileSync(join(directory, "latest-mac.yml"), "utf8"), version)
  const files: FileInfo[] = []
  for (const name of expectedAssetNames(metadata)) {
    const path = join(directory, name)
    const info = statSync(path)
    if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty artifact: ${name}.`)
    const hash = createHash("sha512")
    for await (const chunk of createReadStream(path)) hash.update(chunk)
    files.push({ name, size: info.size, sha512: hash.digest("base64") })
  }
  verifyFiles(metadata, files)
  return { metadata, files }
}

function verifySignature(appPath: string, version: string): void {
  run("codesign", ["--verify", "--deep", "--strict", appPath])
  // codesign writes its display output to stderr even on success.
  const details = run("codesign", ["--display", "--verbose=4", appPath], { captureStderr: true })
  if (!details.includes("Authority=LNC Internal Signature\n") || !/flags=.*\bruntime\b/.test(details) ||
      !details.includes("Identifier=com.latenightcreation.event-horizon\n")) {
    throw new Error("Package must have the expected signing authority, app identifier and hardened runtime.")
  }
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
  const database = join(userData, "app.sqlite")
  const started = Date.now()
  try {
    // Stay up for at least 10 seconds; allow a slow first launch (e.g. Gatekeeper scanning) up to 60.
    for (;;) {
      const running = !failure && child.exitCode === null && child.signalCode === null
      const migrated = existsSync(database) && output.includes(`Database migrated: ${database}`)
      const elapsed = Date.now() - started
      if (running && migrated && elapsed >= 10_000) break
      if (!running || elapsed >= 60_000) throw new Error(`Isolated app launch failed: ${failure?.message ?? output}`)
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

export async function verifyPackages(directory: string, metadata: Metadata): Promise<void> {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "event-horizon-smoke-")))
  let stillMounted = false
  try {
    const zip = metadata.files.find((file) => file.name.endsWith(".zip"))!
    run("ditto", ["-x", "-k", join(directory, zip.name), join(root, "zip")])
    const appPath = join(root, "zip/Event Horizon.app")
    verifySignature(appPath, metadata.version)
    const dmg = metadata.files.find((file) => file.name.endsWith(".dmg"))!
    const mount = join(root, "dmg")
    run("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mount, join(directory, dmg.name)])
    try { verifySignature(join(mount, "Event Horizon.app"), metadata.version) }
    finally { stillMounted = !detach(mount) }
    await smokeLaunch(appPath, root)
  } finally {
    // Never delete through a mounted volume; leave the directory for manual cleanup instead.
    if (stillMounted) console.warn(`Could not detach ${join(root, "dmg")}. Eject it, then delete ${root}.`)
    else rmSync(root, { recursive: true, force: true })
  }
}
