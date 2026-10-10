import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { register } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import {
  LEGACY_TABLES,
  clearLegacyImport,
  findMissingReferences,
  findSchemaProblems,
  importLegacyData,
  readLegacyData,
  verifyLegacyImport,
  type Fields,
  type ImportBackend,
  type LegacyData,
  type TableReport,
} from "../convex/lib/legacyImport.ts"
import { checkValue, type ValidatorShape } from "../convex/lib/schemaCheck.ts"

// One-time copy of the SQLite database into an empty Convex deployment.
//
//   npm run legacy-import -- --sqlite <path> --dry-run
//   npm run legacy-import -- --sqlite <path> --target local|dev|prod
//   npm run legacy-import -- --reset --target local|dev|prod
//
// A failed import rolls itself back. --reset empties the deployment by hand (e.g.
// if the script was killed mid-import); it refuses if the app has written anything.
//
// The SQLite file is opened read-only. Quit the app first so the file isn't
// changing. The ID map (legacy UUID → Convex ID) is written under .event-horizon/.

const cli = resolve("node_modules/convex/bin/main.js")
const IMPORT_FLAG = "EVENT_HORIZON_LEGACY_IMPORT"

export type Target = "local" | "dev" | "prod"

type Options = { sqlite: string | null; dryRun: boolean; reset: boolean; target: Target | null }

export function parseOptions(argv: readonly string[]): Options {
  const value = (flag: string) => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const sqlite = value("--sqlite") ?? null
  const dryRun = argv.includes("--dry-run")
  const reset = argv.includes("--reset")
  const target = value("--target") ?? null
  if (target !== null && target !== "local" && target !== "dev" && target !== "prod") throw new Error("--target must be local, dev or prod")
  if (reset) {
    if (sqlite || dryRun) throw new Error("--reset only empties the deployment; run it on its own with --target")
    if (!target) throw new Error("Pass --target local|dev|prod with --reset")
    return { sqlite: null, dryRun: false, reset: true, target }
  }
  if (!sqlite) throw new Error("Pass --sqlite <path to app.sqlite>")
  if (!dryRun && !target) throw new Error("Pass --target local|dev|prod (or --dry-run to only read the SQLite file)")
  return { sqlite, dryRun, reset: false, target }
}

/**
 * The `convex` CLI flags for the requested target, after checking that this
 * checkout's .env.local selects a matching deployment. Never guesses: a
 * mismatch is an error.
 */
export function targetFlags(target: Target, envFile: string, envFilePath: string): string[] {
  const deployment = /^CONVEX_DEPLOYMENT\s*=\s*([^\s#]+)/m.exec(envFile)?.[1] ?? ""
  if (/^(?:CONVEX_DEPLOY_KEY|CONVEX_SELF_HOSTED_URL)\s*=/m.test(envFile)) throw new Error("Remove deployment overrides from .env.local before importing")
  const isLocal = deployment.startsWith("local:") || deployment.startsWith("anonymous:")
  if (target === "local" && !isLocal) throw new Error(`--target local needs a local deployment in .env.local (found "${deployment}")`)
  if ((target === "dev" || target === "prod") && !deployment.startsWith("dev:")) {
    throw new Error(`--target ${target} must run from a checkout whose .env.local selects the cloud dev deployment (found "${deployment}")`)
  }
  return ["--env-file", envFilePath, ...(target === "prod" ? ["--prod"] : [])]
}

function convex(args: string[], flags: string[]): string {
  const result = spawnSync(process.execPath, [cli, ...args, ...flags], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`convex ${args.slice(0, 2).join(" ")} failed:\n${result.stderr || result.stdout}`)
  return result.stdout
}

function convexBackend(flags: string[]): ImportBackend {
  const run = <T>(name: string, args: object): T => JSON.parse(convex(["run", name, JSON.stringify(args)], flags)) as T
  return {
    nonEmptyTables: async () => run<string[]>("legacyImport:nonEmptyTables", {}),
    insertBatch: async (table, docs) => run<string[]>("legacyImport:insertBatch", { table, docs }),
    dump: async (table) => {
      const docs: Fields[] = []
      let cursor: string | null = null
      for (;;) {
        const page: { page: Fields[]; isDone: boolean; continueCursor: string } =
          run("legacyImport:dump", { table, paginationOpts: { cursor, numItems: 500 } })
        docs.push(...page.page)
        if (page.isDone) return docs
        cursor = page.continueCursor
      }
    },
    deletePage: async (table) => run<number>("legacyImport:deletePage", { table }),
  }
}

/**
 * The Convex schema. Its files import each other without extensions (Convex's
 * bundler allows that, Node doesn't), so a small hook retries those imports as .ts.
 */
export async function loadSchema(): Promise<ConvexSchema> {
  const hook = "export async function resolve(s, c, next) { try { return await next(s, c) } catch (e) { " +
    "if (e.code === 'ERR_MODULE_NOT_FOUND' && /^\\.\\.?\\//.test(s)) return next(s + '.ts', c); throw e } }"
  register(`data:text/javascript,${encodeURIComponent(hook)}`)
  // A variable specifier keeps the script typecheck (NodeNext) from following the import into convex/.
  const path = "../convex/schema.ts"
  return ((await import(path)) as { default: ConvexSchema }).default
}

type ConvexSchema = { tables: Record<string, { validator: ValidatorShape }> }

/** Everything that would make the import fail or come out incomplete, found without writing anything. */
export function findDataProblems(data: LegacyData, schema: ConvexSchema): string[] {
  return [
    ...findMissingReferences(data),
    ...findSchemaProblems(data, (table, fields) => checkValue(schema.tables[table].validator, fields)),
  ]
}

/** Reads every table in one read transaction, so the snapshot is consistent. */
function readSqlite(path: string): LegacyData {
  const sqlite = new Database(path, { readonly: true, fileMustExist: true })
  try {
    return sqlite.transaction(() => readLegacyData((sql) => sqlite.prepare(sql).all() as Record<string, unknown>[]))()
  } finally {
    sqlite.close()
  }
}

export function formatReport(reports: readonly TableReport[]): string {
  const width = Math.max(...reports.map((report) => report.table.length))
  return reports.map(({ table, source, target, problems }) => {
    const status = problems.length === 0 ? "ok" : `${problems.length} problem(s)`
    const lines = [`${table.padEnd(width)}  sqlite ${String(source).padStart(5)}  convex ${String(target).padStart(5)}  ${status}`]
    for (const problem of problems.slice(0, 20)) lines.push(`    ${problem}`)
    if (problems.length > 20) lines.push(`    … ${problems.length - 20} more`)
    return lines.join("\n")
  }).join("\n")
}

/** Runs `work` with the deployment's import functions switched on, then switches them off. */
async function withImportEnabled<T>(flags: string[], work: () => Promise<T>): Promise<T> {
  convex(["env", "set", IMPORT_FLAG, "enabled"], flags)
  try {
    return await work()
  } finally {
    convex(["env", "remove", IMPORT_FLAG], flags)
  }
}

async function main(): Promise<void> {
  if (process.env.CONVEX_DEPLOY_KEY || process.env.CONVEX_SELF_HOSTED_URL) throw new Error("Unset Convex deployment overrides before importing")
  const options = parseOptions(process.argv.slice(2))
  if (options.reset) {
    const flags = targetFlags(options.target!, readFileSync(resolve(".env.local"), "utf8"), resolve(".env.local"))
    console.log(`Emptying the ${options.target} deployment…`)
    await withImportEnabled(flags, () => clearLegacyImport(convexBackend(flags), (message) => console.log(`  ${message}`)))
    console.log("The deployment is empty and ready for an import.")
    return
  }
  const data = readSqlite(resolve(options.sqlite!))

  console.log("SQLite rows:")
  for (const { table } of LEGACY_TABLES) console.log(`  ${table}: ${data[table].length}`)
  const problems = findDataProblems(data, await loadSchema())
  if (problems.length > 0) {
    console.error(`The SQLite data can't be imported (${problems.length} problem(s)):\n${problems.join("\n")}`)
    process.exitCode = 1
    return
  }
  console.log("All references resolve and every row matches the Convex schema.")
  if (options.dryRun) return

  const envFilePath = resolve(".env.local")
  const flags = targetFlags(options.target!, readFileSync(envFilePath, "utf8"), envFilePath)
  const backend = convexBackend(flags)
  console.log(`Importing into the ${options.target} deployment…`)
  const idMap = await withImportEnabled(flags, () => importLegacyData(data, backend, (message) => console.log(`  ${message}`)))

  const mapPath = resolve(".event-horizon/legacy-import", `id-map-${options.target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  mkdirSync(dirname(mapPath), { recursive: true })
  writeFileSync(mapPath, JSON.stringify(Object.fromEntries(idMap), null, 2))
  console.log(`ID map written to ${mapPath}`)

  const reports = await verifyLegacyImport(data, idMap, backend)
  console.log(`Verification:\n${formatReport(reports)}`)
  if (reports.some((report) => report.problems.length > 0)) process.exitCode = 1
  else console.log("Every row, field and reference matches.")
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
