// One-time import of the SQLite database into Convex. Shared by the CLI
// (scripts/legacy-import.ts) and the tests; it has no runtime imports, so Node can
// run it directly with --experimental-strip-types.
//
// SQLite rows keep their UUIDs as `legacyId`. Convex creates its own IDs, so tables
// are inserted parents-first and every reference is rewritten through the ID map.
// Imported records have no known author: audit fields stay absent.

/** Every table except users (convex/legacyImport.ts checks this against the schema). */
export type LegacyTable =
  | "events" | "contacts" | "vendorCategories" | "tournamentDetails" | "cartDetails" | "payments" | "touchpoints"
  | "menuOfChargeItems" | "timeblocks" | "foodItems" | "beverageItems" | "beverageItemTimeblocks" | "contactRoles" | "eventContacts"

type TableSpec = {
  table: LegacyTable
  sqlTable: string
  /** null for link rows, which have no ID of their own. */
  idColumn: "id" | null
  /** Convex field → SQLite column. */
  columns: Record<string, string>
  /** Fields stored as 0/1 in SQLite and booleans in Convex. */
  booleans?: readonly string[]
  /** Fields stored as JSON text in SQLite. */
  json?: readonly string[]
  /** Reference field → the table it points to. */
  refs?: Record<string, LegacyTable>
}

/** SQLite column names are the snake_case of the Convex field, except where listed. */
function columnsFor(fields: readonly string[], overrides: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, overrides[field] ?? field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)]))
}

/** In insertion order: every table comes after the tables it references. */
export const LEGACY_TABLES: readonly TableSpec[] = [
  {
    table: "events", sqlTable: "events", idColumn: "id",
    columns: columnsFor(["title", "type", "status", "startDateTime", "endDateTime", "minGuests", "maxGuests", "guestCountFinal",
      "driveFolderId", "calendarId", "clientNotes", "internalNotes", "isInternal", "createdAt", "updatedAt"]),
  },
  {
    table: "contacts", sqlTable: "contacts", idColumn: "id",
    columns: columnsFor(["kind", "firstName", "lastName", "organizationName", "displayName", "email", "emailNormalized",
      "phone", "notes", "archivedAt", "createdAt", "updatedAt"]),
  },
  {
    table: "vendorCategories", sqlTable: "vendor_categories", idColumn: "id",
    columns: columnsFor(["key", "label", "colorToken", "sortOrder", "archivedAt"]),
  },
  {
    table: "tournamentDetails", sqlTable: "tournament_details", idColumn: "id",
    columns: columnsFor(["eventId", "time", "startFormat", "playFormat", "numberOfPlayers", "paceOfPlay", "leadCarts", "notes", "createdAt", "updatedAt"]),
    refs: { eventId: "events" },
  },
  {
    table: "cartDetails", sqlTable: "cart_details", idColumn: "id",
    columns: columnsFor(["eventId", "time", "layout", "customGrid", "whatGoesOnCarts", "assignedTo", "rentingCarts", "createdAt", "updatedAt"]),
    booleans: ["rentingCarts"], json: ["customGrid"], refs: { eventId: "events" },
  },
  {
    table: "payments", sqlTable: "payments", idColumn: "id",
    columns: columnsFor(["eventId", "amountCents", "date", "recieptNumber", "notes", "createdAt"]),
    refs: { eventId: "events" },
  },
  {
    table: "touchpoints", sqlTable: "touchpoints", idColumn: "id",
    columns: columnsFor(["eventId", "title", "dueDate", "completedAt", "createdAt"]),
    refs: { eventId: "events" },
  },
  {
    table: "menuOfChargeItems", sqlTable: "menu_of_charge_items", idColumn: "id",
    columns: columnsFor(["eventId", "name", "quantity", "category", "includes", "unitPriceCents", "createdAt"], { category: "charge_type" }),
    refs: { eventId: "events" },
  },
  {
    table: "timeblocks", sqlTable: "timeblocks", idColumn: "id",
    columns: columnsFor(["eventId", "title", "time", "details", "sectionType", "assignedTo", "createdAt", "updatedAt"]),
    refs: { eventId: "events" },
  },
  {
    table: "foodItems", sqlTable: "food_items", idColumn: "id",
    columns: columnsFor(["timeblockId", "name", "quantity", "serviceStyle", "includes", "unitPriceCents"]),
    refs: { timeblockId: "timeblocks" },
  },
  {
    table: "beverageItems", sqlTable: "beverage_items", idColumn: "id",
    columns: columnsFor(["eventId", "name", "quantity", "type", "serviceStyle", "includes", "unitPriceCents"]),
    refs: { eventId: "events" },
  },
  {
    table: "beverageItemTimeblocks", sqlTable: "beverage_item_timeblocks", idColumn: null,
    columns: columnsFor(["beverageItemId", "timeblockId"]),
    refs: { beverageItemId: "beverageItems", timeblockId: "timeblocks" },
  },
  {
    table: "contactRoles", sqlTable: "contact_roles", idColumn: "id",
    columns: columnsFor(["contactId", "role", "vendorCategoryId", "createdAt"]),
    refs: { contactId: "contacts", vendorCategoryId: "vendorCategories" },
  },
  {
    table: "eventContacts", sqlTable: "event_contacts", idColumn: "id",
    columns: columnsFor(["eventId", "contactId", "role", "vendorCategoryId", "isPrimary", "roleLabel", "notes", "sortOrder", "removedAt", "createdAt", "updatedAt"]),
    booleans: ["isPrimary"], refs: { eventId: "events", contactId: "contacts", vendorCategoryId: "vendorCategories" },
  },
]

export type Fields = Record<string, unknown>
export type LegacyRow = { legacyId: string | null; fields: Fields }
export type LegacyData = Record<LegacyTable, LegacyRow[]>
/** `${table}:${legacyId}` → Convex ID. */
export type LegacyIdMap = Map<string, string>

const mapKey = (table: LegacyTable, legacyId: string) => `${table}:${legacyId}`

/** The SELECT for a table, aliasing every column to its Convex field. Ordered so runs are repeatable. */
export function selectSql(spec: TableSpec): string {
  const columns = Object.entries(spec.columns).map(([field, column]) => `"${column}" AS "${field}"`)
  if (spec.idColumn) columns.unshift(`"${spec.idColumn}" AS "legacyId"`)
  const order = spec.idColumn ? `"${spec.idColumn}"` : Object.values(spec.columns).map((column) => `"${column}"`).join(", ")
  return `SELECT ${columns.join(", ")} FROM "${spec.sqlTable}" ORDER BY ${order}`
}

function convertValue(spec: TableSpec, field: string, value: unknown): unknown {
  if (value === undefined) return null
  if (spec.booleans?.includes(field)) {
    if (value !== 0 && value !== 1) throw new Error(`${spec.table}.${field}: expected 0 or 1, got ${JSON.stringify(value)}`)
    return value === 1
  }
  if (spec.json?.includes(field) && typeof value === "string") return JSON.parse(value) as unknown
  return value
}

/** Converts rows read with `selectSql` into Convex field values (references still hold legacy IDs). */
export function toLegacyRows(spec: TableSpec, rows: readonly Record<string, unknown>[]): LegacyRow[] {
  return rows.map((row) => {
    const legacyId = spec.idColumn ? row.legacyId : null
    if (spec.idColumn && (typeof legacyId !== "string" || !legacyId)) throw new Error(`${spec.table}: row without an ID`)
    const fields: Fields = {}
    for (const field of Object.keys(spec.columns)) fields[field] = convertValue(spec, field, row[field])
    return { legacyId: legacyId as string | null, fields }
  })
}

/** Reads every legacy table through `all(sql)` (e.g. better-sqlite3's `prepare(sql).all()`). */
export function readLegacyData(all: (sql: string) => Record<string, unknown>[]): LegacyData {
  return Object.fromEntries(LEGACY_TABLES.map((spec) => [spec.table, toLegacyRows(spec, all(selectSql(spec)))])) as LegacyData
}

/** References that point at rows missing from the source; any found means the import would be incomplete. */
export function findMissingReferences(data: LegacyData): string[] {
  const ids = new Set<string>()
  for (const spec of LEGACY_TABLES) for (const row of data[spec.table]) if (row.legacyId) ids.add(mapKey(spec.table, row.legacyId))
  const problems: string[] = []
  for (const spec of LEGACY_TABLES) {
    for (const row of data[spec.table]) {
      for (const [field, target] of Object.entries(spec.refs ?? {})) {
        const value = row.fields[field]
        if (value !== null && !ids.has(mapKey(target, String(value)))) {
          problems.push(`${spec.table} ${row.legacyId ?? JSON.stringify(row.fields)}: ${field} points to missing ${target} ${String(value)}`)
        }
      }
    }
  }
  return problems
}

/** The document to insert: references rewritten to Convex IDs. */
export function toConvexDocument(spec: TableSpec, fields: Fields, idMap: LegacyIdMap): Fields {
  const doc = { ...fields }
  for (const [field, target] of Object.entries(spec.refs ?? {})) {
    const value = doc[field]
    if (value === null) continue
    const id = idMap.get(mapKey(target, String(value)))
    if (!id) throw new Error(`${spec.table}.${field}: no Convex ID for ${target} ${String(value)}`)
    doc[field] = id
  }
  return doc
}

/** Splits rows into batches whose JSON stays under `maxBytes` (Convex argument and CLI limits). */
export function chunkBySize<T>(items: readonly T[], maxBytes: number): T[][] {
  const chunks: T[][] = []
  let current: T[] = []
  let size = 0
  for (const item of items) {
    const itemSize = JSON.stringify(item).length + 1
    if (current.length > 0 && size + itemSize > maxBytes) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += itemSize
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/** The calls the import needs from a deployment; the CLI runs them through `convex run`. */
export type ImportBackend = {
  /** Tables that already hold documents (any at all blocks the import). */
  nonEmptyTables: () => Promise<string[]>
  insertBatch: (table: LegacyTable, docs: Fields[]) => Promise<string[]>
  /** Every document in a table, with `_id`. */
  dump: (table: LegacyTable) => Promise<Fields[]>
}

const BATCH_BYTES = 200_000

export async function importLegacyData(
  data: LegacyData,
  backend: ImportBackend,
  log: (message: string) => void = () => undefined,
): Promise<LegacyIdMap> {
  const missing = findMissingReferences(data)
  if (missing.length > 0) throw new Error(`The SQLite data has broken references:\n${missing.join("\n")}`)
  const occupied = await backend.nonEmptyTables()
  if (occupied.length > 0) throw new Error(`The target deployment already has data in: ${occupied.join(", ")}. Import only into an empty deployment.`)

  const idMap: LegacyIdMap = new Map()
  for (const spec of LEGACY_TABLES) {
    const rows = data[spec.table]
    for (const batch of chunkBySize(rows.map((row) => ({ row, doc: toConvexDocument(spec, row.fields, idMap) })), BATCH_BYTES)) {
      const ids = await backend.insertBatch(spec.table, batch.map(({ doc }) => doc))
      if (ids.length !== batch.length) throw new Error(`${spec.table}: inserted ${ids.length} of ${batch.length} rows`)
      batch.forEach(({ row }, index) => { if (row.legacyId) idMap.set(mapKey(spec.table, row.legacyId), ids[index]) })
    }
    log(`${spec.table}: ${rows.length}`)
  }
  return idMap
}

export type TableReport = { table: LegacyTable; source: number; target: number; problems: string[] }

const SYSTEM_AND_AUDIT_FIELDS = new Set(["_id", "_creationTime", "createdBy", "updatedBy"])

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Fields)[key])}`).join(",")}}`
  }
  return JSON.stringify(value ?? null)
}

/** The fields compared after import: everything except system/audit fields; absent and null are equal. */
function comparable(doc: Fields): string {
  const fields: Fields = {}
  for (const [key, value] of Object.entries(doc)) if (!SYSTEM_AND_AUDIT_FIELDS.has(key) && value !== null && value !== undefined) fields[key] = value
  return stableJson(fields)
}

/**
 * Compares every source row with what the deployment holds: counts, that each
 * legacy record maps to exactly one document, every field value, and that every
 * reference points at the mapped parent.
 */
export async function verifyLegacyImport(data: LegacyData, idMap: LegacyIdMap, backend: Pick<ImportBackend, "dump">): Promise<TableReport[]> {
  const reports: TableReport[] = []
  for (const spec of LEGACY_TABLES) {
    const rows = data[spec.table]
    const docs = await backend.dump(spec.table)
    const problems: string[] = []
    if (docs.length !== rows.length) problems.push(`expected ${rows.length} documents, found ${docs.length}`)

    if (spec.idColumn) {
      const byId = new Map(docs.map((doc) => [String(doc._id), doc]))
      const seen = new Set<string>()
      for (const row of rows) {
        const id = idMap.get(mapKey(spec.table, row.legacyId!))
        const doc = id ? byId.get(id) : undefined
        if (!id || !doc) { problems.push(`${row.legacyId}: missing`); continue }
        if (seen.has(id)) problems.push(`${row.legacyId}: shares a document with another row`)
        seen.add(id)
        if (comparable(doc) !== comparable(toConvexDocument(spec, row.fields, idMap))) problems.push(`${row.legacyId}: fields differ`)
      }
    } else {
      // Link rows have no ID: compare them as a multiset of documents.
      const expected = rows.map((row) => comparable(toConvexDocument(spec, row.fields, idMap))).sort()
      const actual = docs.map(comparable).sort()
      if (stableJson(expected) !== stableJson(actual)) problems.push("link rows differ")
    }
    reports.push({ table: spec.table, source: rows.length, target: docs.length, problems })
  }
  return reports
}
