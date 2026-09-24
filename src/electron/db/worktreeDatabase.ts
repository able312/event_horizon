import { execFileSync } from "node:child_process"
import { existsSync, linkSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import Database from "better-sqlite3"

const WORKTREE_DB_DIR = ".event-horizon"
const DB_NAME = "app.sqlite"

function git(worktreePath: string, ...args: string[]): string {
  return execFileSync("git", ["-C", worktreePath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

export function getWorktreeDbPath(worktreePath: string): string {
  return join(worktreePath, WORKTREE_DB_DIR, DB_NAME)
}

export function findOriginBranch(reflog: string): string | undefined {
  const creation = reflog.split("\n").find((entry) => entry.startsWith("branch: Created from "))
  const source = creation?.slice("branch: Created from ".length)
  if (!source || source === "HEAD" || /^[0-9a-f]{7,40}$/.test(source)) return undefined
  return source.replace(/^refs\/heads\//, "")
}

export function findBranchWorktree(worktreeList: string, branch: string): string | undefined {
  const branchRef = `refs/heads/${branch}`
  for (const entry of worktreeList.split(/\n\s*\n/)) {
    const lines = entry.split("\n")
    if (lines.includes(`branch ${branchRef}`)) {
      return lines.find((line) => line.startsWith("worktree "))?.slice("worktree ".length)
    }
  }
  return undefined
}

export function getDevelopmentDbPath(worktreePath: string, userDataPath: string): string {
  const branch = git(worktreePath, "branch", "--show-current")
  if (branch === "main") return join(userDataPath, DB_NAME)
  return getWorktreeDbPath(worktreePath)
}

function getSourceDbPath(worktreePath: string, userDataPath: string): string {
  const override = process.env.EVENT_HORIZON_DB_SOURCE
  if (override) {
    if (!isAbsolute(override)) throw new Error("EVENT_HORIZON_DB_SOURCE must be an absolute path to an SQLite file")
    return override
  }

  const branch = git(worktreePath, "branch", "--show-current")
  const origin = findOriginBranch(git(worktreePath, "reflog", "show", "--format=%gs", branch))
  if (!origin) {
    throw new Error(`Cannot determine the source database for branch ${branch}. Set EVENT_HORIZON_DB_SOURCE to its absolute SQLite file path before the first launch.`)
  }
  if (origin === "main") return join(userDataPath, DB_NAME)

  const sourceWorktree = findBranchWorktree(git(worktreePath, "worktree", "list", "--porcelain"), origin)
  if (!sourceWorktree) {
    throw new Error(`Source branch ${origin} has no active worktree. Set EVENT_HORIZON_DB_SOURCE to its absolute SQLite file path before the first launch.`)
  }
  return getWorktreeDbPath(sourceWorktree)
}

/** Seed a new worktree with a consistent SQLite snapshot, including any WAL data. */
export function prepareDevelopmentDb(worktreePath: string, userDataPath: string): string {
  const dbPath = getDevelopmentDbPath(worktreePath, userDataPath)
  if (dbPath === join(userDataPath, DB_NAME) || existsSync(dbPath)) return dbPath

  const sourcePath = getSourceDbPath(worktreePath, userDataPath)
  if (!existsSync(sourcePath)) {
    throw new Error(`Source database does not exist: ${sourcePath}. Set EVENT_HORIZON_DB_SOURCE to an existing SQLite file before the first launch.`)
  }

  mkdirSync(dirname(dbPath), { recursive: true })
  const snapshotDir = mkdtempSync(join(dirname(dbPath), ".snapshot-"))
  const snapshotPath = join(snapshotDir, DB_NAME)
  try {
    const source = new Database(sourcePath, { readonly: true, fileMustExist: true })
    try {
      // VACUUM INTO is an online SQLite snapshot. A filesystem copy could miss WAL changes.
      source.exec(`VACUUM INTO '${snapshotPath.replaceAll("'", "''")}'`)
    } finally {
      source.close()
    }
    try {
      // A hard link publishes the complete snapshot only if no other launch won the race.
      linkSync(snapshotPath, dbPath)
    } catch (error) {
      if (!existsSync(dbPath)) throw error
    }
  } finally {
    rmSync(snapshotDir, { recursive: true, force: true })
  }
  console.log(`Seeded worktree database from ${sourcePath} to ${dbPath}`)
  return dbPath
}
