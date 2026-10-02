import { appendFileSync, mkdirSync, statSync, renameSync } from "node:fs"
import { dirname } from "node:path"
import { inspect } from "node:util"

export function createUpdaterLogger(logPath: string) {
  function write(level: string, args: unknown[]) {
    const message = `${new Date().toISOString()} ${level} ${args.map(value => inspect(value, { depth: 5 })).join(" ")}\n`
    try {
      mkdirSync(dirname(logPath), { recursive: true })
      try {
        if (statSync(logPath).size > 5 * 1024 * 1024) renameSync(logPath, `${logPath}.previous`)
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
      }
      appendFileSync(logPath, message)
    } catch (error) {
      console.error("Could not write updater log:", error, message)
    }
  }
  return {
    info: (...args: unknown[]) => write("INFO", args),
    warn: (...args: unknown[]) => write("WARN", args),
    error: (...args: unknown[]) => write("ERROR", args),
    debug: (...args: unknown[]) => write("DEBUG", args),
  }
}
