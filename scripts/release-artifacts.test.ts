// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createPackage } from "@electron/asar"
import { verifyWindowsBuild } from "./release-artifacts.ts"
import { ArtifactValidationError } from "./release-logic.ts"

const version = "1.2.3"
let directory: string

/** A minimal PE header: "MZ", e_lfanew at 0x3c, then "PE\0\0" and the machine type. */
function executable(machine: number): Buffer {
  const header = Buffer.alloc(0x100)
  header.write("MZ", 0, "latin1")
  header.writeUInt32LE(0x80, 0x3c)
  header.write("PE\0\0", 0x80, "latin1")
  header.writeUInt16LE(machine, 0x84)
  return header
}

async function writeBuild(options: { machine?: number; packageJson?: object; feed?: string; indexHtml?: boolean } = {}) {
  const app = join(directory, "win-unpacked")
  const source = join(directory, "app-source")
  mkdirSync(join(app, "resources"), { recursive: true })
  mkdirSync(join(source, "dist-electron/electron"), { recursive: true })
  mkdirSync(join(source, "dist-react"), { recursive: true })
  writeFileSync(join(app, "Event Horizon.exe"), executable(options.machine ?? 0x8664))
  writeFileSync(join(source, "package.json"), JSON.stringify(options.packageJson ?? { version, main: "dist-electron/electron/main.js" }))
  writeFileSync(join(source, "dist-electron/electron/main.js"), "")
  if (options.indexHtml ?? true) writeFileSync(join(source, "dist-react/index.html"), "")
  await createPackage(source, join(app, "resources/app.asar"))
  writeFileSync(join(app, "resources/app-update.yml"), options.feed ?? "owner: able312\nrepo: event_horizon\nprovider: github\nprivate: false\n")
}

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "event-horizon-win-test-")) })
afterEach(() => { rmSync(directory, { recursive: true, force: true }) })

describe("verifyWindowsBuild", () => {
  it("accepts an x64 build of this version with the GitHub update feed", async () => {
    await writeBuild()
    expect(() => verifyWindowsBuild(directory, version)).not.toThrow()
  })
  it("accepts a CRLF update feed", async () => {
    await writeBuild({ feed: "owner: able312\r\nrepo: event_horizon\r\nprovider: github\r\n" })
    expect(() => verifyWindowsBuild(directory, version)).not.toThrow()
  })
  it.each([
    [{ machine: 0xaa64 }, "not an x64"],
    [{ packageJson: { version: "1.2.2", main: "dist-electron/electron/main.js" } }, "wrong version"],
    [{ packageJson: { version } }, "no main entry"],
    [{ packageJson: { version, main: "missing.js" } }, "missing.js"],
    [{ indexHtml: false }, "index.html"],
    [{ feed: "owner: someone-else\nrepo: event_horizon\nprovider: github\n" }, "app-update.yml"],
    [{ feed: "provider: generic\nurl: https://example.com\n" }, "app-update.yml"],
  ] as const)("rejects a broken build (%o)", async (options, message) => {
    await writeBuild(options)
    expect(() => verifyWindowsBuild(directory, version)).toThrow(ArtifactValidationError)
    expect(() => verifyWindowsBuild(directory, version)).toThrow(message)
  })
  it("rejects a missing build", () => {
    expect(() => verifyWindowsBuild(directory, version)).toThrow(ArtifactValidationError)
  })
})
