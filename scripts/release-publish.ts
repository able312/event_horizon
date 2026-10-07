import { runRelease } from "./release.ts"

runRelease(process.argv.slice(2), true).catch((error: unknown) => {
  console.error(`\nRelease stopped: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
