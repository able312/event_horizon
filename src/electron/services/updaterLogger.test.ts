// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it, vi } from "vitest"
import { createUpdaterLogger } from "./updaterLogger.js"

it("records diagnostic details and rotates a bounded log", () => {
  const directory = mkdtempSync(join(tmpdir(), "updater-log-"))
  try {
    const file = join(directory, "logs", "updater.log")
    const logger = createUpdaterLogger(file)
    logger.error(new Error("native signature failed"))
    expect(readFileSync(file, "utf8")).toContain("native signature failed")
    writeFileSync(file, "x".repeat(5 * 1024 * 1024 + 1))
    logger.info("recovered")
    expect(readFileSync(file, "utf8")).toContain("recovered")
    expect(readFileSync(`${file}.previous`, "utf8").length).toBe(5 * 1024 * 1024 + 1)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

it("keeps logging failure from interrupting updater work", () => {
  const directory = mkdtempSync(join(tmpdir(), "updater-log-"))
  const fallback = vi.spyOn(console, "error").mockImplementation(() => undefined)
  try {
    const blocked = join(directory, "file")
    writeFileSync(blocked, "not a directory")
    expect(() => createUpdaterLogger(join(blocked, "updater.log")).error("offline")).not.toThrow()
    expect(fallback).toHaveBeenCalled()
  } finally { fallback.mockRestore(); rmSync(directory, { recursive: true, force: true }) }
})
