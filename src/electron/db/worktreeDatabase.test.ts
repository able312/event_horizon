// @vitest-environment node
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, it } from "vitest"
import { getDevelopmentDbPath } from "./worktreeDatabase.js"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

it("keeps main in user data and gives worktrees their own path without looking up an origin", () => {
  const root = mkdtempSync(join(tmpdir(), "event-horizon-worktree-"))
  roots.push(root)
  const main = join(root, "main")
  const child = join(root, "child")
  const userData = join(root, "user-data")

  execFileSync("git", ["init", "-b", "main", main])
  execFileSync("git", ["-C", main, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-m", "initial"])
  execFileSync("git", ["-C", main, "worktree", "add", "-b", "feature/child", child])

  expect(getDevelopmentDbPath(main, userData)).toBe(join(userData, "app.sqlite"))
  expect(getDevelopmentDbPath(child, userData)).toBe(join(child, ".event-horizon", "app.sqlite"))
})
