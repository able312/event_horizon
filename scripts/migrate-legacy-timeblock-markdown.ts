import Database from "better-sqlite3"

import {
  migrateLegacyHeadingSyntax,
} from "../src/lib/markdown/legacyMarkdownMigration.ts"

type TimeblockRow = {
  id: string
  details: string | null
}

function printUsage(): void {
  console.log(`Usage: node --experimental-strip-types scripts/migrate-legacy-timeblock-markdown.ts --db <path> [--write]

Migrates legacy inverted heading syntax in timeblocks.details to real markdown.
Defaults to dry-run. Pass --write to persist changes.

Back up your sqlite database before running with --write.`)
}

function parseArgs(argv: string[]): { dbPath: string | null; write: boolean } {
  let dbPath: string | null = null
  let write = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--write") {
      write = true
      continue
    }

    if (arg === "--db") {
      dbPath = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (arg === "--help" || arg === "-h") {
      printUsage()
      process.exit(0)
    }
  }

  return { dbPath, write }
}

function main(): void {
  const { dbPath, write } = parseArgs(process.argv.slice(2))

  if (!dbPath) {
    printUsage()
    process.exit(1)
  }

  const db = new Database(dbPath, { readonly: !write })
  const rows = db
    .prepare("SELECT id, details FROM timeblocks WHERE details IS NOT NULL")
    .all() as TimeblockRow[]

  const updates: Array<{ id: string; before: string; after: string }> = []

  for (const row of rows) {
    const before = row.details ?? ""
    const after = migrateLegacyHeadingSyntax(before)
    if (after !== before) {
      updates.push({ id: row.id, before, after })
    }
  }

  if (updates.length === 0) {
    console.log("No timeblocks.details rows require migration.")
    db.close()
    return
  }

  console.log(`${write ? "Writing" : "Dry run"}: ${updates.length} row(s) to migrate.\n`)

  for (const update of updates) {
    console.log(`timeblock ${update.id}`)
    console.log("--- before ---")
    console.log(update.before)
    console.log("--- after ----")
    console.log(update.after)
    console.log("")
  }

  if (!write) {
    console.log("Dry run complete. Re-run with --write to persist changes.")
    db.close()
    return
  }

  const updateStatement = db.prepare("UPDATE timeblocks SET details = ? WHERE id = ?")

  const migrateAll = db.transaction((items: typeof updates) => {
    for (const item of items) {
      updateStatement.run(item.after, item.id)
    }
  })

  migrateAll(updates)
  db.close()

  console.log(`Updated ${updates.length} row(s).`)
}

main()
