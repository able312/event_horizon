import { spawnSync } from "node:child_process"

export function run(command: string, args: string[], options: { live?: boolean; env?: NodeJS.ProcessEnv; timeout?: number; captureStderr?: boolean } = {}): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.live ? "inherit" : "pipe",
    timeout: options.timeout ?? 120_000,
    maxBuffer: 8 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr?.trim() || `exit ${result.status}, signal ${result.signal}`}`)
  }
  return `${result.stdout ?? ""}${options.captureStderr ? result.stderr ?? "" : ""}`.trim()
}

export function npm(script: string, args: string[] = []): void {
  console.log(`\nRunning ${script}…`)
  run("npm", ["run", script, ...(args.length ? ["--", ...args] : [])], { live: true, timeout: 20 * 60_000 })
}
