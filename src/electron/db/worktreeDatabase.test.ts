import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"
import { findOriginBranch, getDevelopmentDbPath, getWorktreeDbPath, prepareDevelopmentDb } from "./worktreeDatabase.js"

const roots: string[] = []

function git(worktree: string, ...args: string[]): void {
  execFileSync("git", ["-C", worktree, ...args], { stdio: "pipe" })
}

function writeDatabase(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path)
  sqlite.exec("CREATE TABLE example (value TEXT NOT NULL)")
  sqlite.prepare("INSERT INTO example (value) VALUES (?)").run(value)
  sqlite.close()
}

function readValue(path: string): string {
  const sqlite = new Database(path, { readonly: true })
  try {
    return (sqlite.prepare("SELECT value FROM example").get() as { value: string }).value
  } finally {
    sqlite.close()
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  delete process.env.EVENT_HORIZON_DB_SOURCE
})

describe("worktree database", () => {
  it("copies the originating worktree database once, including nested worktrees", () => {
    const root = mkdtempSync(join(tmpdir(), "event-horizon-worktree-"))
    roots.push(root)
    const main = join(root, "main")
    const child = join(root, "child")
    const grandchild = join(root, "grandchild")
    const ambiguous = join(root, "ambiguous")
    const userData = join(root, "user-data")

    execFileSync("git", ["init", "-b", "main", main], { stdio: "pipe" })
    git(main, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-m", "initial")
    writeDatabase(join(userData, "app.sqlite"), "main data")
    expect(getDevelopmentDbPath(main, userData)).toBe(join(userData, "app.sqlite"))

    git(main, "worktree", "add", "-b", "feature/child", child, "main")
    expect(prepareDevelopmentDb(child, userData)).toBe(getWorktreeDbPath(child))
    expect(readValue(getWorktreeDbPath(child))).toBe("main data")

    const childDb = new Database(getWorktreeDbPath(child))
    childDb.pragma("journal_mode = WAL")
    childDb.prepare("UPDATE example SET value = ?").run("child data")

    git(child, "worktree", "add", "-b", "feature/grandchild", grandchild, "feature/child")
    prepareDevelopmentDb(grandchild, userData)
    expect(readValue(getWorktreeDbPath(grandchild))).toBe("child data")
    expect(readValue(join(userData, "app.sqlite"))).toBe("main data")
    childDb.close()

    // Relaunching must preserve edits rather than reseeding the snapshot.
    prepareDevelopmentDb(child, userData)
    expect(readValue(getWorktreeDbPath(child))).toBe("child data")

    git(child, "worktree", "add", "-b", "feature/ambiguous", ambiguous)
    expect(() => prepareDevelopmentDb(ambiguous, userData)).toThrow("Cannot determine the source database")
    process.env.EVENT_HORIZON_DB_SOURCE = getWorktreeDbPath(child)
    prepareDevelopmentDb(ambiguous, userData)
    expect(readValue(getWorktreeDbPath(ambiguous))).toBe("child data")
  })

  it("does not guess a source when Git only records HEAD", () => {
    expect(findOriginBranch("branch: Created from HEAD")).toBeUndefined()
    expect(findOriginBranch("branch: Created from refs/heads/feature/child")).toBe("feature/child")
  })
})
