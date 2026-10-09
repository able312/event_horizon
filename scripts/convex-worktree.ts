import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { resolveWorkOSClientId } from "../src/electron/services/authConfig.ts"

const cli = resolve("node_modules/convex/bin/main.js")
const marker = resolve(".convex/worktree-setup-complete")

export function assertLocalDeployment(envFile: string): void {
  if (/^(?:CONVEX_DEPLOY_KEY|CONVEX_SELF_HOSTED_URL)\s*=/m.test(envFile)) throw new Error("Deployment overrides are forbidden for local worktree setup")
  const deployment = /^CONVEX_DEPLOYMENT\s*=\s*([^\s#]+)/m.exec(envFile)?.[1]
  const url = /^VITE_CONVEX_URL\s*=\s*([^\s#]+)/m.exec(envFile)?.[1]
  if (!deployment?.startsWith("local:") || !url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    throw new Error("Worktree setup requires a local Convex deployment; refusing to write to cloud data")
  }
}

function run(args: string[]): void {
  const result = spawnSync(process.execPath, [cli, ...args, "--env-file", resolve(".env.local")], { stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Convex ${args[0]} failed`)
}

async function main(): Promise<void> {
  if (process.env.CONVEX_DEPLOY_KEY || process.env.CONVEX_SELF_HOSTED_URL) throw new Error("Unset Convex deployment overrides before local development")
  if (process.argv.includes("--finish")) {
    assertLocalDeployment(readFileSync(".env.local", "utf8"))
    const clientId = resolveWorkOSClientId(false, process.env)
    if (!clientId) throw new Error("Development WorkOS client ID is missing")
    run(["env", "set", "WORKOS_CLIENT_ID", clientId])
    run(["env", "set", "EVENT_HORIZON_LOCAL_SEED", "enabled"])
    run(["run", "developmentSeed:seed", "{}"])
    writeFileSync(marker, "ready")
    return
  }
  // The main checkout keeps the cloud development database.
  const gitDir = spawnSync("git", ["rev-parse", "--git-dir"], { encoding: "utf8" })
  const commonDir = spawnSync("git", ["rev-parse", "--git-common-dir"], { encoding: "utf8" })
  const isWorktree = gitDir.status === 0 && commonDir.status === 0 && resolve(gitDir.stdout.trim()) !== resolve(commonDir.stdout.trim())
  if (process.argv.includes("--dev")) {
    if (isWorktree) assertLocalDeployment(readFileSync(".env.local", "utf8"))
    else {
      const env = readFileSync(".env.local", "utf8")
      if (!/^CONVEX_DEPLOYMENT\s*=\s*dev:/m.test(env)) throw new Error("Main checkout development requires its cloud dev deployment")
    }
    const dev = spawn(process.execPath, [cli, "dev", "--start", "npm-run-all --parallel dev:react dev:electron"], { stdio: "inherit" })
    for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => dev.kill(signal))
    await new Promise<void>((resolveDone, reject) => { dev.on("error", reject); dev.on("exit", (code) => { process.exitCode = code ?? 0; resolveDone() }) })
    return
  }
  if (!isWorktree) {
    throw new Error("Run convex:worktree in a linked worktree, not the main checkout")
  }
  // A deploy key can override the selection. Never inherit one for local setup.
  rmSync(marker, { force: true })
  const backend = spawn(process.execPath, [cli, "dev", "--configure", "existing", "--team", "jboddy07", "--project", "event-horizon", "--dev-deployment", "local", "--start", "node --experimental-strip-types scripts/convex-worktree.ts --finish"], { stdio: "inherit" })
  await new Promise<void>((resolveReady, reject) => {
    let bootstrapped = false
    let checking = false
    const poll = setInterval(async () => {
      // Auth config is evaluated before --start can run. Set its required env
      // as soon as the selected local backend is listening, then dev retries.
      if (!bootstrapped && !checking && existsSync(".env.local")) {
        checking = true
        try {
          const env = readFileSync(".env.local", "utf8")
          assertLocalDeployment(env)
          const url = /^VITE_CONVEX_URL\s*=\s*([^\s#]+)/m.exec(env)![1]
          const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(1000) })
          if (response.ok) {
            run(["env", "set", "WORKOS_CLIENT_ID", resolveWorkOSClientId(false, process.env)!])
            bootstrapped = true
          }
        } catch {
          // Configuration/download/startup is still in progress.
        } finally { checking = false }
      }
      if (!existsSync(marker)) return
      clearInterval(poll)
      clearTimeout(timeout)
      backend.kill("SIGINT")
      resolveReady()
    }, 500)
    const timeout = setTimeout(() => {
      clearInterval(poll)
      backend.kill("SIGINT")
      reject(new Error("Local setup did not complete; inspect the Convex output above"))
    }, 180000)
    backend.on("exit", (code) => {
      clearInterval(poll)
      clearTimeout(timeout)
      if (!existsSync(marker)) reject(new Error(`Local setup exited before completion (${code})`))
    })
    backend.on("error", reject)
  })
  console.log("Isolated Convex database configured and seeded. Start it with npm run dev.")
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
