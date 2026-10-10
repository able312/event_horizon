import { spawn } from "node:child_process"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"
import { expect, it, vi } from "vitest"
import { assertLocalDeployment } from "./convex-worktree.ts"

it("allows only local deployments with loopback renderer URLs", () => {
  expect(() => assertLocalDeployment("CONVEX_DEPLOYMENT=local:worktree\nVITE_CONVEX_URL=http://127.0.0.1:3210")).not.toThrow()
  for (const env of ["", "CONVEX_DEPLOYMENT=dev:shared\nVITE_CONVEX_URL=http://localhost:3210", "CONVEX_DEPLOYMENT=local:branch\nVITE_CONVEX_URL=https://shared.convex.cloud", "CONVEX_DEPLOYMENT=prod:venue\nVITE_CONVEX_URL=https://venue.convex.cloud"]) {
    expect(() => assertLocalDeployment(env)).toThrow(/refusing/)
  }
})

it.skipIf(process.platform === "win32").each(["interrupt", "backend-exit"])("stops descendant servers on %s", async (mode) => {
  const moduleUrl = pathToFileURL(resolve("scripts/convex-worktree.ts")).href
  const serverCode = `const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    console.log(JSON.stringify([process.pid, child.pid]));
    ${mode === "backend-exit" ? "setTimeout(() => process.exit(7), 100);" : "setInterval(() => {}, 1000);"}`
  const wrapper = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e",
    `import { runDevelopmentProcess } from ${JSON.stringify(moduleUrl)};
     process.exitCode = await runDevelopmentProcess(process.execPath, ['-e', ${JSON.stringify(serverCode)}]);`],
  { stdio: ["ignore", "pipe", "pipe"] })
  const exited = new Promise<number | null>((done) => wrapper.once("exit", done))
  let pids: number[] = []
  try {
    pids = await new Promise<number[]>((done, reject) => {
      let output = ""
      const timer = setTimeout(() => reject(new Error("Fixture did not start")), 5000)
      wrapper.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString()
        if (!output.includes("\n")) return
        clearTimeout(timer)
        done(JSON.parse(output.split("\n")[0]) as number[])
      })
    })
    if (mode === "interrupt") wrapper.kill("SIGTERM")
    expect(await exited).toBe(mode === "interrupt" ? 143 : 7)
    await vi.waitFor(() => {
      for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow()
    }, { timeout: 5000 })
  } finally {
    wrapper.kill("SIGTERM")
    for (const pid of pids) {
      try { process.kill(pid, "SIGKILL") } catch { /* Already stopped. */ }
    }
  }
}, 10_000)
