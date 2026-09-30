import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const MIGRATIONS_FOLDER = join(process.cwd(), "migrations/drizzle")

type Journal = { entries: Array<{ idx: number; tag: string }> }

export type TempMigrationsFolder = {
  folder: string
  cleanup: () => Promise<void>
}

/**
 * Copies the real migrations folder, keeping only the migrations before `tag`.
 * Lets a migration test build the schema as it was before that migration ran.
 */
export async function createMigrationsFolderBefore(tag: string): Promise<TempMigrationsFolder> {
  const tempRoot = await mkdtemp(join(tmpdir(), "event-horizon-migrations-"))
  const folder = join(tempRoot, "drizzle")
  await cp(MIGRATIONS_FOLDER, folder, { recursive: true })

  const journalPath = join(folder, "meta/_journal.json")
  const journal: Journal = JSON.parse(await readFile(journalPath, "utf8"))
  const target = journal.entries.find((entry) => entry.tag === tag)
  if (!target) throw new Error(`Expected ${tag} migration entry`)

  const removed = journal.entries.filter((entry) => entry.idx >= target.idx)
  journal.entries = journal.entries.filter((entry) => entry.idx < target.idx)
  await writeFile(journalPath, JSON.stringify(journal, null, 2))
  await Promise.all(removed.map((entry) => rm(join(folder, `${entry.tag}.sql`), { force: true })))

  return {
    folder,
    cleanup: () => rm(tempRoot, { recursive: true, force: true }),
  }
}
