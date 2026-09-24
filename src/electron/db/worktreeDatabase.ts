import { execFileSync } from "node:child_process"
import { join } from "node:path"

export function getDevelopmentDbPath(worktreePath: string, userDataPath: string): string {
  const branch = execFileSync("git", ["-C", worktreePath, "branch", "--show-current"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

  return branch === "main"
    ? join(userDataPath, "app.sqlite")
    : join(worktreePath, ".event-horizon", "app.sqlite")
}
